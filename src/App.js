import React, { useState, useEffect, ErrorBoundary } from 'react';
import './App.css';
import { Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import Pusher from 'pusher-js';
import { createTradeTransaction } from './utils/trading';
import { postUpdateToPump } from './utils/pumpUpdate';

// Need this shit for Solana
window.Buffer = window.Buffer || require('buffer').Buffer;

// Add at the top with other constants
const TRIBIFY_TOKEN_MINT = "672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump";

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
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
          // Remove the auto-connect
          setConnectionState('disconnected');
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

  // Update the Pusher effect
  useEffect(() => {
    try {
      const pusher = new Pusher(process.env.REACT_APP_PUSHER_KEY, {
        cluster: process.env.REACT_APP_PUSHER_CLUSTER,
        encrypted: true,
        authEndpoint: '/api/pusher-auth'
      });

      // Use a presence channel for real-time user tracking
      const channel = pusher.subscribe('presence-tribify');
      
      channel.bind('pusher:subscription_succeeded', (members) => {
        console.log('Successfully subscribed to presence channel', members);
        // Update connected users from presence data
        const users = [];
        members.each((member) => users.push(member.info));
        setConnectedUsers(prev => [...prev, ...users]);
      });

      channel.bind('pusher:member_added', (member) => {
        console.log('Member added:', member);
        setConnectedUsers(prev => [...prev, member.info]);
      });

      channel.bind('pusher:member_removed', (member) => {
        console.log('Member removed:', member);
        setConnectedUsers(prev => prev.filter(u => u.address !== member.info.address));
      });

      return () => {
        channel.unbind_all();
        channel.unsubscribe();
      };
    } catch (error) {
      console.error('Pusher setup error:', error);
    }
  }, [publicKey]);

  // Add this effect to fetch token holders
  useEffect(() => {
    if (isConnected) {
      fetchTokenHolders();
    }
  }, [isConnected]);

  // Add admin check when wallet connects
  useEffect(() => {
    if (publicKey === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv') {
      setIsAdmin(true);
    }
  }, [publicKey]);

  // Add RPC test in useEffect
  useEffect(() => {
    const testRPC = async () => {
      try {
        console.log('Testing RPC connection...');
        const slot = await connection.getSlot();
        console.log('RPC working, current slot:', slot);
      } catch (error) {
        console.error('RPC connection failed:', error);
      }
    };
    testRPC();
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
        
        // Add timeout for mobile connections
        const connectionPromise = window.solana.connect();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 30000)
        );

        const response = await Promise.race([connectionPromise, timeoutPromise]);
        
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
      console.error('Connection error:', error);
      setConnectionState('error');
      // More specific error messages for mobile
      setErrorMessage(error.message === 'Connection timeout' 
        ? 'Connection timed out. Please try again.' 
        : error.message);
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

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: publicKey,
          message: newMessage,
          timestamp: Date.now()
        })
      });
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Update the filter function
  const filteredUsers = connectedUsers.filter(user => 
    user.address.toLowerCase().includes(searchQuery.toLowerCase()) && 
    user.tokenBalance > 0  // Only show users with Tribify tokens
  );

  // Update the fetchTokenHolders function
  const fetchTokenHolders = async () => {
    try {
      console.log('Fetching token holders with mint:', TRIBIFY_TOKEN_MINT);
      const mintPubkey = new PublicKey(TRIBIFY_TOKEN_MINT);
      console.log('Mint pubkey:', mintPubkey.toBase58());

      // Try a different approach using getTokenLargestAccounts
      const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey);
      console.log('Largest accounts:', largestAccounts);

      const holders = await Promise.all(
        largestAccounts.value.map(async (account) => {
          const accountInfo = await connection.getParsedAccountInfo(account.address);
          console.log('Account info:', accountInfo);
          
          if (accountInfo.value?.data.parsed?.info?.owner) {
            return {
              address: accountInfo.value.data.parsed.info.owner,
              tokenBalance: account.amount / Math.pow(10, 9) // Assuming 9 decimals
            };
          }
          return null;
        })
      );

      const validHolders = holders.filter(h => h !== null);
      console.log('Valid holders:', validHolders);
      setConnectedUsers(validHolders);
    } catch (error) {
      console.error('Failed to fetch token holders:', error);
    }
  };

  // Add trading function
  const handleTrade = async (action, amount, inSol = true) => {
    try {
      setStatus(`Creating ${action} transaction...`);
      const tx = await createTradeTransaction({
        publicKey: publicKey,
        action: action,
        amount: amount,
        inSol: inSol,
        slippage: 10,
        priorityFee: 0.005
      });

      setStatus('Please sign transaction...');
      const signed = await window.solana.signTransaction(tx);
      
      setStatus('Sending transaction...');
      const signature = await connection.sendRawTransaction(signed.serialize());
      
      setStatus('Confirming...');
      await connection.confirmTransaction(signature);
      setStatus(`${action} transaction confirmed! ◈`);

      // Update balances
      await updateBalance(window.solana.publicKey);
      await fetchTokenHolders();
    } catch (error) {
      console.error('Trade failed:', error);
      setStatus(`Trade failed: ${error.message}`);
    }
  };

  useEffect(() => {
    console.log('Production check:', {
      NODE_ENV: process.env.NODE_ENV,
      hasHelius: !!process.env.REACT_APP_HELIUS_KEY,
      hasPusher: !!process.env.REACT_APP_PUSHER_KEY,
      hasPusherCluster: !!process.env.REACT_APP_PUSHER_CLUSTER
    });
  }, []);

  // Add search handler function
  const handleSearch = (e) => {
    e.preventDefault(); // Prevent page refresh
    console.log('Searching for:', searchQuery);
    // Search is already handled by filteredUsers
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
                      <span>◇ {Number(user.tokenBalance).toFixed(4)} SOL</span>
                      <span className="last-active">{user.lastActive}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="token-holders">
              <div className="holders-header">$TRIBIFY Holders</div>
              <div className="holders-list">
                {connectedUsers.map((user, i) => (
                  <div key={i} className="holder-item">
                    <div className="holder-address">
                      ◈ {user.address.slice(0,4)}...{user.address.slice(-4)}
                    </div>
                    <div className="holder-balance">
                      ◇ {Number(user.tokenBalance).toFixed(4)} $TRIBIFY
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="messages-container">
              <div className="user-search">
                <form onSubmit={handleSearch}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch(e);
                      }
                    }}
                    placeholder="Search users by address..."
                    className="search-input"
                  />
                </form>
                <div className="search-results">
                  {filteredUsers.map((user, i) => (
                    <div 
                      key={i} 
                      className={`search-result ${selectedUser?.address === user.address ? 'selected' : ''}`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <span>◈ {user.address.slice(0,4)}...{user.address.slice(-4)}</span>
                      <span>◇ {Number(user.tokenBalance).toFixed(4)} $TRIBIFY</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedUser && (
                <>
                  <div className="messages-list">
                    {messages
                      .filter(msg => msg.from === selectedUser.address || msg.to === selectedUser.address)
                      .map((msg, i) => (
                        <div key={i} className={`message ${msg.from === publicKey ? 'sent' : 'received'}`}>
                          <div className="message-sender">◈ {msg.from.slice(0,4)}...{msg.from.slice(-4)}</div>
                          <div className="message-content">{msg.message}</div>
                        </div>
                      ))}
                  </div>
                  <div className="message-input">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder={`Message ${selectedUser.address.slice(0,4)}...${selectedUser.address.slice(-4)}`}
                    />
                    <button onClick={sendMessage}>Send</button>
                  </div>
                </>
              )}
            </div>
            {isAdmin && (
              <div className="admin-panel">
                <button onClick={() => postUpdateToPump(window, "New update: ...")}>
                  Post Update to pump.fun
                </button>
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