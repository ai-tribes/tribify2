import React, { useState, useEffect, ErrorBoundary } from 'react';
import './App.css';
import { Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import Pusher from 'pusher-js';

// Need this shit for Solana
window.Buffer = window.Buffer || require('buffer').Buffer;

function App() {
  console.log('Environment check:', {
    hasHeliusKey: !!process.env.REACT_APP_HELIUS_KEY,
    hasPusherKey: !!process.env.REACT_APP_PUSHER_KEY,
    hasPusherCluster: !!process.env.REACT_APP_PUSHER_CLUSTER
  });

  console.log('Raw env values:', {
    pusherKey: process.env.REACT_APP_PUSHER_KEY,
    pusherCluster: process.env.REACT_APP_PUSHER_CLUSTER
  });

  // Check if it's daytime (between 6am and 6pm)
  const isDaytime = () => {
    const hours = new Date().getHours();
    return hours >= 6 && hours < 18;
  };

  const [isDark, setIsDark] = useState(!isDaytime());
  const [status, setStatus] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [connectionState, setConnectionState] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [otherWallets, setOtherWallets] = useState([
    { name: 'Phantom', connected: true },
    { name: 'Solflare', connected: false },
    { name: 'Backpack', connected: false },
    { name: 'Glow', connected: false }
  ]);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [socket, setSocket] = useState(null);

  // Connection instance
  const connection = new Connection(
    `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
    'confirmed'
  );

  // Update theme based on time of day
  useEffect(() => {
    const interval = setInterval(() => {
      setIsDark(!isDaytime());
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Enhanced connection check
  useEffect(() => {
    const checkConnection = async () => {
      try {
        setConnectionState('connecting');
        if (window.solana) {
          const resp = await window.solana.connect({ onlyIfTrusted: true });
          if (resp.publicKey) {
            setIsConnected(true);
            setPublicKey(resp.publicKey.toString());
            updateBalance(resp.publicKey);
            fetchTransactions(resp.publicKey);
            setConnectionState('connected');
          } else {
            setConnectionState('disconnected');
          }
        }
      } catch (error) {
        setConnectionState('disconnected');
        resetStates();
      }
    };
    checkConnection();

    // Listen for wallet connection changes
    const handleWalletChange = () => {
      if (!window.solana?.isConnected) {
        resetStates();
      }
    };
    window.solana?.on('disconnect', handleWalletChange);
    window.solana?.on('accountChanged', handleWalletChange);

    return () => {
      window.solana?.removeListener('disconnect', handleWalletChange);
      window.solana?.removeListener('accountChanged', handleWalletChange);
    };
  }, []);

  // Replace Socket.io effect with Pusher
  useEffect(() => {
    try {
      const pusher = new Pusher(process.env.REACT_APP_PUSHER_KEY, {
        cluster: process.env.REACT_APP_PUSHER_CLUSTER,
        encrypted: true
      });

      console.log('Pusher initialized'); // Debug log

      const channel = pusher.subscribe('tribify');
      
      channel.bind('user-connected', (data) => {
        console.log('User connected event:', data);
        setConnectedUsers(prev => [...prev, data]);
      });

      channel.bind('pusher:subscription_succeeded', () => {
        console.log('Successfully subscribed to channel');
      });

      channel.bind('pusher:subscription_error', (error) => {
        console.error('Pusher subscription error:', error);
      });

      return () => {
        channel.unbind_all();
        channel.unsubscribe();
      };
    } catch (error) {
      console.error('Pusher setup error:', error);
    }
  }, []);

  const resetStates = () => {
    setIsConnected(false);
    setPublicKey(null);
    setBalance(null);
    setTransactions([]);
    setStatus('');
    setConnectionState('disconnected');
    setErrorMessage('');
  };

  const updateBalance = async (pubKey) => {
    try {
      const bal = await connection.getBalance(pubKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Balance error:', error);
    }
  };

  const fetchTransactions = async (pubKey) => {
    try {
      const signatures = await connection.getSignaturesForAddress(pubKey, { limit: 5 });
      setTransactions(signatures);
    } catch (error) {
      console.error('Transaction fetch error:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      setConnectionState('disconnecting');
      await window.solana.disconnect();
      resetStates();
    } catch (error) {
      setConnectionState('error');
      setErrorMessage('Failed to disconnect: ' + error.message);
    }
  };

  const handleClick = async () => {
    if (!window.solana) {
      setConnectionState('error');
      setErrorMessage('Phantom wallet not installed');
      return;
    }

    try {
      if (!isConnected) {
        setConnectionState('connecting');
        setStatus('Connecting...');
        const response = await window.solana.connect();
        setIsConnected(true);
        setPublicKey(response.publicKey.toString());
        await updateBalance(response.publicKey);
        await fetchTransactions(response.publicKey);
        setStatus('Connected: ' + response.publicKey.toString().slice(0,4) + '...');
        setConnectionState('connected');
      } else {
        // Transaction logic...
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: window.solana.publicKey,
            toPubkey: window.solana.publicKey,
            lamports: LAMPORTS_PER_SOL * 0.001
          })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = window.solana.publicKey;

        setStatus('Please sign...');
        const signed = await window.solana.signTransaction(transaction);
        
        setStatus('Sending...');
        const signature = await connection.sendRawTransaction(signed.serialize());
        
        setStatus('Confirming...');
        await connection.confirmTransaction(signature);
        setStatus('Transaction confirmed! ◈');

        // Update balance and transactions after confirmation
        await updateBalance(window.solana.publicKey);
        await fetchTransactions(window.solana.publicKey);
      }
    } catch (error) {
      console.error(error);
      setConnectionState('error');
      setErrorMessage(error.message);
      if (error.code === 4001) {
        resetStates();
      }
    }
  };

  const fetchConnectedUsers = async () => {
    try {
      // This would need to be implemented with your backend
      // const users = await fetchActiveUsers();
      // setConnectedUsers(users);
    } catch (error) {
      console.error('Failed to fetch connected users:', error);
    }
  };

  return (
    <div className={`App ${isDark ? 'dark' : 'light'}`}>
      <div className={`connection-status ${connectionState}`}>
        {connectionState === 'connecting' && '◎ Connecting...'}
        {connectionState === 'connected' && '◉ Connected'}
        {connectionState === 'disconnecting' && '◌ Disconnecting...'}
        {connectionState === 'error' && '⊗ ' + errorMessage}
      </div>
      <button className="mode-toggle" onClick={() => setIsDark(!isDark)}>
        {isDark ? '◯' : '●'}
      </button>
      <div className="content">
        <div className="button-group">
          <button onClick={handleClick}>
            {isConnected ? '⬡ Send' : '⬢ Connect'}
          </button>
          {isConnected && (
            <button className="disconnect" onClick={handleDisconnect}>
              ⊗ Disconnect
            </button>
          )}
        </div>
        {isConnected && (
          <>
            <div className="wallet-info">
              <div>◈ {publicKey?.slice(0,4)}...{publicKey?.slice(-4)}</div>
              <div>◇ {balance?.toFixed(4)} SOL</div>
            </div>
            {transactions.length > 0 && (
              <div className="transactions">
                <div className="tx-header">Recent Transactions</div>
                {transactions.map((tx, i) => (
                  <div key={i} className="tx-item">
                    ◊ {tx.signature.slice(0,4)}...{tx.signature.slice(-4)}
                  </div>
                ))}
              </div>
            )}
            {isConnected && connectedUsers.length > 0 && (
              <div className="connected-users">
                <div className="users-header">Connected Users</div>
                {connectedUsers.map((user, i) => (
                  <div key={i} className="user-item">
                    <div className="user-address">
                      ◈ {user.address?.slice(0,4)}...{user.address?.slice(-4)}
                    </div>
                    <div className="user-details">
                      <span>◇ {Number(user.balance).toFixed(4)} SOL</span>
                      <span className="last-active">{user.lastActive}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {status && <div className="status">{status}</div>}
      </div>
    </div>
  );
}

export default App; 