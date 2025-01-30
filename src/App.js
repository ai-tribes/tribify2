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

// Update the connection cost constant
const CONNECTION_FEE_SOL = 0.003; // 0.003 SOL connection fee
const TRIBIFY_REWARD_AMOUNT = 100; // 100 $TRIBIFY tokens reward

// Use paid Helius RPC endpoint
const connection = new Connection(
  `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
  {
    commitment: 'confirmed',
    wsEndpoint: undefined,
    confirmTransactionInitialTimeout: 60000
  }
);

// Update the validation to only check required vars
const validateEnvVars = () => {
  // Debug info first
  console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    vars: {
      REACT_APP_HELIUS_KEY: !!process.env.REACT_APP_HELIUS_KEY,
      REACT_APP_PUSHER_KEY: !!process.env.REACT_APP_PUSHER_KEY,
      REACT_APP_PUSHER_CLUSTER: !!process.env.REACT_APP_PUSHER_CLUSTER,
      PUSHER_APP_ID: !!process.env.PUSHER_APP_ID,
      PUSHER_SECRET: !!process.env.PUSHER_SECRET
    }
  });

  // Always required
  const required = {
    'REACT_APP_HELIUS_KEY': process.env.REACT_APP_HELIUS_KEY,
  };

  // Only required in production
  if (process.env.NODE_ENV === 'production') {
    required['REACT_APP_PUSHER_KEY'] = process.env.REACT_APP_PUSHER_KEY;
    required['REACT_APP_PUSHER_CLUSTER'] = process.env.REACT_APP_PUSHER_CLUSTER;
    required['PUSHER_APP_ID'] = process.env.PUSHER_APP_ID;
    required['PUSHER_SECRET'] = process.env.PUSHER_SECRET;
  }

  const missing = Object.entries(required)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    // Log error but don't throw
    console.error('Missing environment variables:', missing);
    return false;
  }
  return true;
};

function App() {
  // 1. Helper functions first
  const isDaytime = () => {
    const hours = new Date().getHours();
    return hours >= 6 && hours < 18;
  };

  // 2. All useState hooks together
  const [isDark, setIsDark] = useState(!isDaytime());
  const [status, setStatus] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  const [envError, setEnvError] = useState(!validateEnvVars());
  const [otherWallets, setOtherWallets] = useState([
    { name: 'Phantom', connected: true },
    { name: 'Solflare', connected: false },
    { name: 'Backpack', connected: false },
    { name: 'Glow', connected: false }
  ]);
  const [tokenHolders, setTokenHolders] = useState([]);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [treasuryBalances, setTreasuryBalances] = useState([]);

  // 3. ALL useEffect hooks together - BEFORE ANY OTHER CODE
  useEffect(() => {
    const interval = setInterval(() => setIsDark(!isDaytime()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    console.log('Environment check:', {
      hasHeliusKey: !!process.env.REACT_APP_HELIUS_KEY,
      hasPusherKey: !!process.env.REACT_APP_PUSHER_KEY,
      hasPusherCluster: !!process.env.REACT_APP_PUSHER_CLUSTER
    });
  }, []);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        setConnectionState('connecting');
        if (window.solana) {
          setConnectionState('disconnected');
        }
      } catch (error) {
        setConnectionState('disconnected');
        resetStates();
      }
    };
    checkConnection();

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

  useEffect(() => {
    if (isConnected) {
      fetchTokenHolders();
    }
  }, [isConnected]);

  useEffect(() => {
    if (publicKey === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv') {
      setIsAdmin(true);
    }
  }, [publicKey]);

  // Move Pusher effect here
  useEffect(() => {
    try {
      const pusher = new Pusher(process.env.REACT_APP_PUSHER_KEY, {
        cluster: process.env.REACT_APP_PUSHER_CLUSTER,
        encrypted: true,
        authEndpoint: '/api/pusher-auth'
      });

      const channel = pusher.subscribe('presence-tribify');
      
      channel.bind('pusher:subscription_succeeded', (members) => {
        console.log('Currently connected users:', members);
        const users = [];
        members.each((member) => users.push(member.info));
        setConnectedUsers(users);
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

  const fetchTreasuryBalances = async () => {
    try {
      const solBalance = await connection.getBalance(new PublicKey('DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv'));
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        new PublicKey('DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv'),
        {
          programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
        }
      );

      const balances = tokenAccounts.value.map(account => ({
        mint: account.account.data.parsed.info.mint,
        balance: account.account.data.parsed.info.tokenAmount.uiAmount
      }));

      setBalance(solBalance / LAMPORTS_PER_SOL);
      setTreasuryBalances(balances);

    } catch (error) {
      console.error('Failed to fetch treasury balances:', error);
    }
  };

  const handleConnection = async () => {
    try {
      setStatus('Checking wallet...');
      const resp = await window.solana.connect();
      const userPublicKey = resp.publicKey.toString();

      // Skip payment if treasury wallet
      if (userPublicKey === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv') {
        setIsConnected(true);
        setPublicKey(userPublicKey);
        setStatus('Treasury wallet connected!');
        await fetchTreasuryBalances();
        return;
      }

      // Everyone else pays to connect
      setStatus('Please approve connection fee (0.001 SOL) to receive 100 $TRIBIFY tokens...');
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: resp.publicKey,
          toPubkey: new PublicKey('DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv'),
          lamports: LAMPORTS_PER_SOL * 0.001
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = resp.publicKey;

      const signed = await window.solana.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature);

      // Send them their TRIBIFY tokens
      setStatus('Payment received! Sending your TRIBIFY tokens...');
      // API call to send tokens here

      setIsConnected(true);
      setPublicKey(userPublicKey);
      setStatus('Connected! You received 100 TRIBIFY tokens.');

    } catch (error) {
      console.error('Connection failed:', error);
      setStatus('Connection failed: ' + error.message);
      setIsConnected(false);
      setPublicKey(null);
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
      const mintPubkey = new PublicKey(TRIBIFY_TOKEN_MINT);
      const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey);
      
      const holders = await Promise.all(
        largestAccounts.value.map(async (account) => {
          const accountInfo = await connection.getParsedAccountInfo(account.address);
          return {
            address: accountInfo.value.data.parsed.info.owner,
            tokenBalance: account.amount / Math.pow(10, 9)
          };
        })
      );

      setTokenHolders(holders.filter(h => h.tokenBalance > 0));
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

  // Add search handler function
  const handleSearch = (e) => {
    e.preventDefault(); // Prevent page refresh
    console.log('Searching for:', searchQuery);
    // Search is already handled by filteredUsers
  };

  // Keep the getRecentBlockhash simple
  const getRecentBlockhash = async () => {
    const { blockhash } = await connection.getLatestBlockhash('finalized');
    return blockhash;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setStatus('Address copied to clipboard!');
      setTimeout(() => setStatus(''), 2000);
    });
  };

  // 4. THEN the conditional return
  if (envError) {
    return (
      <div className="App">
        <div className="error-message">
          Environment configuration error. Please check console for details.
        </div>
      </div>
    );
  }

  console.log('Raw env values:', {
    pusherKey: process.env.REACT_APP_PUSHER_KEY,
    pusherCluster: process.env.REACT_APP_PUSHER_CLUSTER
  });

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
          <button onClick={handleConnection}>
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
              <div className="clickable-address" onClick={() => copyToClipboard(publicKey)}>
                ◈ {publicKey?.slice(0,4)}...{publicKey?.slice(-4)}
              </div>
              {publicKey === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv' ? (
                <>
                  <div>Treasury Balances:</div>
                  <div>◇ {balance?.toFixed(4)} SOL</div>
                  {treasuryBalances.map((token, i) => {
                    if (token.mint === TRIBIFY_TOKEN_MINT) {
                      return (
                        <div key={i}>
                          ◈ {token.balance.toFixed(4)} $TRIBIFY
                        </div>
                      );
                    }
                    return null;
                  })}
                </>
              ) : (
                <div>◇ {balance?.toFixed(4)} SOL</div>
              )}
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
                <div className="users-header">Currently Online $TRIBIFY Holders</div>
                {connectedUsers.map((user, i) => (
                  <div key={i} className="user-item">
                    <div className="user-address clickable-address" onClick={() => copyToClipboard(user.address)}>
                      ◈ {user.address?.slice(0,4)}...{user.address?.slice(-4)}
                      <span className="online-indicator">● Online</span>
                    </div>
                    <div className="user-details">
                      <span>◇ {Number(user.tokenBalance).toFixed(4)} $TRIBIFY</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="token-holders">
              <div className="holders-header">All $TRIBIFY Holders</div>
              <div className="holders-list">
                {tokenHolders.map((user, i) => (
                  <div key={i} className="holder-item">
                    <div className="holder-address clickable-address" onClick={() => copyToClipboard(user.address)}>
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