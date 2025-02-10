import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3-force';
import Pusher from 'pusher-js';
import { encrypt, decrypt } from './lib/encryption';
import ThemeToggle from './components/ThemeToggle';

// Need this shit for Solana
window.Buffer = window.Buffer || require('buffer').Buffer;

// Add at the top with other constants
const TRIBIFY_TOKEN_MINT = "672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump";

// Update the connection cost constant
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

// Add the documentation content at the top
const DOCS_CONTENT = `
# Tribify Token Gateway

Welcome token holder! Since you have $TRIBIFY tokens, you can access this documentation.

## How Tribify Works

1. **Payment Flow**
   - User connects Phantom wallet
   - Pays 0.001 SOL
   - Receives 100 $TRIBIFY tokens

2. **Technical Implementation**
   - Frontend in React
   - Vercel serverless API
   - Solana token distribution

3. **Smart Contract Details**
   - Token: $TRIBIFY
   - Mint: 672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump
   - Treasury: DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv

## Token Uses
1. Access to documentation
2. Future governance
3. Community membership
`;

// Add at the top with other constants
const FRIEND_WALLETS = {
  'Aycm5thyEQXMFR6CNVKL5f6SRJ3KVTCGA3HYoRTHN2kN': 'your_secret_password'  // Change this password
};

// Add total supply constant
const TOTAL_SUPPLY = 1_000_000_000; // 1 Billion tokens

// Move this function up, before TokenHolderGraph component
const getHolderColor = (address, tokenBalance) => {
  if (address === '6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7') {
    return '#87CEEB';  // Light blue for LP
  }
  const percentage = (tokenBalance / TOTAL_SUPPLY) * 100;
  if (percentage > 10) {
    return '#ff0000';  // Red for whales
  }
  if (percentage > 1) {
    return '#ffa500';  // Orange/yellow for medium holders
  }
  return '#2ecc71';  // Green for small holders
};

// Add new component for the graph
const TokenHolderGraph = ({ holders, onNodeClick }) => {
  const graphRef = useRef();
  
  // Find the biggest holder to focus on
  const biggestHolder = holders.reduce((max, holder) => 
    holder.tokenBalance > max.tokenBalance ? holder : max
  , holders[0]);

  const graphData = {
    nodes: holders.map(holder => ({
      id: holder.address,
      val: Math.sqrt(holder.tokenBalance),
      tokenBalance: holder.tokenBalance,  // Need this for the nodeColor function
      label: `${((holder.tokenBalance / TOTAL_SUPPLY) * 100).toFixed(2)}%`,
      x: holder.address === biggestHolder.address ? 0 : undefined,
      y: holder.address === biggestHolder.address ? 0 : undefined
    })),
    links: holders.map((holder) => ({
      source: holder.address,
      target: biggestHolder.address,
      value: holder.tokenBalance / TOTAL_SUPPLY
    }))
  };

  const focusOnWhale = () => {
    if (graphRef.current) {
      graphRef.current.centerAt(0, 0, 1000);
      graphRef.current.zoom(0.4);
    }
  };

  useEffect(() => {
    focusOnWhale();
  }, []);

  return (
    <div className="graph-container">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeLabel={node => `${node.id.slice(0, 4)}...${node.id.slice(-4)} (${node.label})`}
        nodeColor={node => getHolderColor(node.id, node.tokenBalance)}
        nodeRelSize={3}
        linkWidth={link => link.value * 2}
        linkColor={() => '#ffffff33'}
        backgroundColor={'#00000000'}
        width={800}
        height={600}
        onNodeClick={node => onNodeClick(node.id)}
        d3Force={{
          charge: d3.forceManyBody().strength(-2000),
          link: d3.forceLink().distance(d => 
            d.source.id === biggestHolder.address || d.target.id === biggestHolder.address ? 200 : 100
          ),
          x: d3.forceX(d => 
            d.id === biggestHolder.address ? 200 : 600
          ).strength(0.5),
          y: d3.forceY(300).strength(0.1)
        }}
      />
      <button onClick={focusOnWhale}>(reset)</button>
    </div>
  );
};

// Add new debug component
const PusherDebugger = ({ pusher, publicKey, onlineUsers }) => {
  const [debugState, setDebugState] = useState({
    connectionState: 'disconnected',
    socketId: null,
    authAttempts: 0,
    authErrors: [],
    lastAuthError: null
  });

  // Monitor Pusher connection
  useEffect(() => {
    if (!pusher) return;

    const updateState = () => {
      setDebugState(prev => ({
        ...prev,
        connectionState: pusher.connection.state,
        socketId: pusher.connection.socket_id
      }));
    };

    // Track all connection events
    pusher.connection.bind('connecting', updateState);
    pusher.connection.bind('connected', updateState);
    pusher.connection.bind('disconnected', updateState);
    pusher.connection.bind('failed', updateState);
    pusher.connection.bind('error', (err) => {
      setDebugState(prev => ({
        ...prev,
        authErrors: [...prev.authErrors, err],
        lastAuthError: err
      }));
    });

    // Track auth attempts
    pusher.connection.bind('auth_request_sent', () => {
      setDebugState(prev => ({
        ...prev,
        authAttempts: prev.authAttempts + 1
      }));
    });

    return () => {
      pusher?.connection.unbind_all();
    };
  }, [pusher]);

  return (
    <div className="connection-status-panel">
      <h3>Connection Status</h3>
      <div className="debug-grid">
        <div className="debug-item">
          <div className="debug-label">State:</div>
          <div className={`debug-value state-${debugState.connectionState}`}>
            {debugState.connectionState}
          </div>
        </div>
        <div className="debug-item">
          <div className="debug-label">Socket ID:</div>
          <div className="debug-value">{debugState.socketId || 'none'}</div>
        </div>
        <div className="debug-item">
          <div className="debug-label">Auth Attempts:</div>
          <div className="debug-value">{debugState.authAttempts}</div>
        </div>
        <div className="debug-item">
          <div className="debug-label">My Public Key:</div>
          <div className="debug-value">{publicKey || 'none'}</div>
        </div>
        <div className="debug-item">
          <div className="debug-label">Online Users:</div>
          <div className="debug-value">{onlineUsers.size}</div>
        </div>
        {debugState.lastAuthError && (
          <div className="debug-item error">
            <div className="debug-label">Last Error:</div>
            <div className="debug-value">{debugState.lastAuthError.message}</div>
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  // Core states only
  const [status, setStatus] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [balance, setBalance] = useState(null);
  const [tokenHolders, setTokenHolders] = useState([]);
  const [showDocs, setShowDocs] = useState(false);
  const [nicknames, setNicknames] = useState({});
  const [editingNickname, setEditingNickname] = useState(null);
  const [treasuryBalances, setTreasuryBalances] = useState({
    sol: 0,
    usdc: 0,
    tribify: 0
  });
  const [activeChat, setActiveChat] = useState(null);  // Will hold the address we're chatting with
  const [messages, setMessages] = useState({});  // Object to store messages by chat address
  const [messageInput, setMessageInput] = useState('');  // For the input field
  const [hasPaid, setHasPaid] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});  // { address: count }
  const [showInbox, setShowInbox] = useState(false);
  const [showAllMessages, setShowAllMessages] = useState(false);

  // Add state for custom dialog
  const [dialogConfig, setDialogConfig] = useState({
    show: false,
    message: '',
    onConfirm: null
  });

  // Add WebSocket connection for real-time updates
  const [socket, setSocket] = useState(null);

  // Add state for password
  const [friendPassword, setFriendPassword] = useState(localStorage.getItem('friend_password'));

  // Add new state for online users
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  // Add new state for tribify prompt
  const [showTribifyPrompt, setShowTribifyPrompt] = useState(false);

  // Add new state for tribify prompt responses
  const [tribifyResponses, setTribifyResponses] = useState([]);
  const [tribifyInput, setTribifyInput] = useState('');

  // Add state for connection debugging
  const [debugState, setDebugState] = useState({
    connectionState: 'disconnected',
    socketId: null,
    authAttempts: 0,
    authErrors: [],
    lastAuthError: null
  });

  // Add new state for message encryption
  const [encryptedMessages, setEncryptedMessages] = useState({});

  // Replace the isDark state with this
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  // Update Pusher initialization code
  const pusher = React.useMemo(() => {
    if (!publicKey) return null;

    console.log('Initializing Pusher connection...');
    
    const pusherClient = new Pusher(process.env.REACT_APP_PUSHER_KEY, {
      cluster: process.env.REACT_APP_PUSHER_CLUSTER,
      authEndpoint: '/api/pusher/auth',
      auth: {
        params: { publicKey }
      }
    });

    // Subscribe to presence channel
    const channel = pusherClient.subscribe('presence-tribify');

    channel.bind('pusher:subscription_succeeded', (members) => {
      console.log('Presence subscription succeeded:', {
        members: members.count,
        myID: members.myID
      });
      
      // Update online users from current members
      const online = new Set();
      members.each(member => {
        online.add(member.id);
        console.log('Member online:', member);
      });
      setOnlineUsers(online);
    });

    channel.bind('pusher:member_added', (member) => {
      console.log('Member joined:', member);
      setOnlineUsers(prev => new Set([...prev, member.id]));
    });

    channel.bind('pusher:member_removed', (member) => {
      console.log('Member left:', member);
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(member.id);
        return next;
      });
    });

    return pusherClient;
  }, [publicKey]);

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      if (pusher) {
        console.log('Cleaning up Pusher connection');
        pusher.disconnect();
      }
    };
  }, [pusher]);

  // Update the theme toggle handler
  const handleThemeToggle = () => {
    setIsDark(prev => {
      const newTheme = !prev;
      localStorage.setItem('theme', newTheme ? 'dark' : 'light');
      document.body.className = newTheme ? 'dark' : 'light';
      return newTheme;
    });
  };

  // Set initial theme class on body
  useEffect(() => {
    document.body.className = isDark ? 'dark' : 'light';
  }, []);

  // Core functions
  const handleConnection = async () => {
    try {
      setStatus('Connecting...');
      
      if (!window.phantom?.solana?.isPhantom) {
        setStatus('Please install Phantom wallet');
        return;
      }

      const resp = await window.phantom.solana.connect();
      const userPublicKey = resp.publicKey.toString();

      // Add ourselves to online users immediately
      setOnlineUsers(prev => new Set([...prev, userPublicKey]));

      // Treasury path
      if (userPublicKey === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv') {
        setIsConnected(true);
        setPublicKey(userPublicKey);
        setStatus('Treasury wallet connected!');
        await updateBalance(userPublicKey);
        fetchTokenHolders();
        return;
      }

      // Friend wallet path
      if (userPublicKey === 'Aycm5thyEQXMFR6CNVKL5f6SRJ3KVTCGA3HYoRTHN2kN') {
        if (!friendPassword) {
          // First time setup - ONE payment then set password
          try {
            setStatus('First time setup - please approve 0.001 SOL payment');
            const transaction = new Transaction().add(
              SystemProgram.transfer({
                fromPubkey: resp.publicKey,
                toPubkey: new PublicKey('DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv'),
                lamports: LAMPORTS_PER_SOL * 0.001
              })
            );

            const { blockhash } = await connection.getLatestBlockhash('processed');
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = resp.publicKey;
            const signed = await window.phantom.solana.signTransaction(transaction);
            await connection.sendRawTransaction(signed.serialize());

            // After payment, show password setup form
            setDialogConfig({
              show: true,
              message: (
                <>
                  <h3>Set Password</h3>
                  <form id="setupForm">
                    <input type="text" name="username" value={userPublicKey} readOnly style={{display: 'none'}} />
                    <input 
                      type="password" 
                      name="password"
                      placeholder="Set your password"
                      autoFocus
                    />
                  </form>
                </>
              ),
              onConfirm: () => {
                const form = document.getElementById('setupForm');
                const password = form.password.value;
                if (password) {
                  localStorage.setItem('friend_password', password);
                  setFriendPassword(password);
                  setIsConnected(true);
                  setPublicKey(userPublicKey);
                  setStatus('Welcome! Password set successfully');
                  updateBalance(userPublicKey);
                  fetchTokenHolders();
                }
              }
            });
          } catch (error) {
            setStatus('Setup failed: ' + error.message);
          }
        } else {
          // Returning user - just login
          setDialogConfig({
            show: true,
            message: (
              <>
                <h3>Login</h3>
                <form id="loginForm">
                  <input type="text" name="username" value={userPublicKey} style={{display: 'none'}} />
                  <input 
                    type="password" 
                    name="password"
                    placeholder="Enter your password"
                    autoFocus
                  />
                </form>
              </>
            ),
            onConfirm: () => {
              const form = document.getElementById('loginForm');
              if (!form) return;
              
              const password = form.elements.password.value;
              if (password === friendPassword) {
                setIsConnected(true);
                setPublicKey(userPublicKey);
                setStatus('Welcome back!');
                updateBalance(userPublicKey);
                fetchTokenHolders();
              } else {
                setStatus('Incorrect password');
              }
            },
            confirmText: 'Login'
          });
        }
        return;
      }

      // Regular user path
      const hasTokenAccount = await checkTokenAccount(userPublicKey);
      if (!hasTokenAccount) {
        // New user - needs to pay
        setStatus('Please approve payment (0.001 SOL) to receive 100 $TRIBIFY...');
        // ... payment logic ...
      } else {
        // Returning user
        setIsConnected(true);
        setPublicKey(userPublicKey);
        setStatus('Welcome back!');
        await updateBalance(userPublicKey);
        fetchTokenHolders();
      }
    } catch (error) {
      console.error('Connection error:', error);
      setStatus('Error: ' + error.message);
    }
  };

  const fetchTokenHolders = async () => {
    try {
      console.log('Starting fetchTokenHolders for connected wallet:', publicKey);
      const mintPubkey = new PublicKey(TRIBIFY_TOKEN_MINT);
      const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      
      // Get all token accounts for TRIBIFY
      console.log('Getting token accounts for mint:', TRIBIFY_TOKEN_MINT);
      const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey);
      console.log('Found token accounts:', largestAccounts);
      
      if (!largestAccounts.value.length) {
        console.log('No token accounts found!');
        return;
      }

      const holders = await Promise.all(
        largestAccounts.value.map(async (account) => {
          console.log('Processing account:', account.address.toString());
          const accountInfo = await connection.getParsedAccountInfo(account.address);
          const address = accountInfo.value.data.parsed.info.owner;
          console.log('Found holder address:', address);
          
          // Get SOL balance
          const solBalance = await connection.getBalance(new PublicKey(address));
          console.log('SOL balance for', address, ':', solBalance / LAMPORTS_PER_SOL);
          
          // Get USDC balance
          let usdcBalance = 0;
          try {
            const usdcAta = await getAssociatedTokenAddress(usdcMint, new PublicKey(address));
            const usdcAccount = await connection.getTokenAccountBalance(usdcAta);
            usdcBalance = usdcAccount.value.uiAmount || 0;
            console.log('USDC balance for', address, ':', usdcBalance);
          } catch (e) {
            console.log('No USDC account for:', address);
          }

          return {
            address,
            tokenBalance: (account.amount / Math.pow(10, 6)) || 0,
            solBalance: (solBalance / LAMPORTS_PER_SOL) || 0,
            usdcBalance: usdcBalance || 0
          };
        })
      );

      console.log('Final processed holders:', holders);
      setTokenHolders(holders.filter(h => h.tokenBalance > 0));
    } catch (error) {
      console.error('Failed to fetch holders:', error);
      console.error('Error details:', error.message);
    }
  };

  // Add function to get SOL balance
  const updateBalance = async (pubKey) => {
    try {
      const bal = await connection.getBalance(new PublicKey(pubKey));
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Balance error:', error);
    }
  };

  // Add function to check token account
  const checkTokenAccount = async (walletAddress) => {
    try {
      const mintPubkey = new PublicKey(TRIBIFY_TOKEN_MINT);
      const ata = await getAssociatedTokenAddress(
        mintPubkey,
        new PublicKey(walletAddress)
      );
      
      const account = await connection.getAccountInfo(ata);
      return !!account;  // true if account exists
    } catch {
      return false;
    }
  };

  // Add function to fetch treasury balances
  const fetchTreasuryBalances = async () => {
    try {
      const treasuryPubkey = new PublicKey('DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv');
      const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      const tribifyMint = new PublicKey(TRIBIFY_TOKEN_MINT);

      // Get SOL balance
      const solBalance = await connection.getBalance(treasuryPubkey);
      
      // Get USDC balance
      let usdcBalance = 0;
      try {
        const usdcAta = await getAssociatedTokenAddress(usdcMint, treasuryPubkey);
        const usdcAccount = await connection.getTokenAccountBalance(usdcAta);
        usdcBalance = usdcAccount.value.uiAmount || 0;
      } catch {}

      // Get TRIBIFY balance
      let tribifyBalance = 0;
      try {
        const tribifyAta = await getAssociatedTokenAddress(tribifyMint, treasuryPubkey);
        const tribifyAccount = await connection.getTokenAccountBalance(tribifyAta);
        tribifyBalance = tribifyAccount.value.uiAmount || 0;
      } catch {}

      setTreasuryBalances({
        sol: solBalance / LAMPORTS_PER_SOL,
        usdc: usdcBalance,
        tribify: tribifyBalance
      });
    } catch (error) {
      console.error('Failed to fetch treasury balances:', error);
    }
  };

  // Call it in useEffect
  useEffect(() => {
    fetchTreasuryBalances();
  }, []);

  // Ping server when we connect
  useEffect(() => {
    if (!publicKey) return;

    // Tell server we're online
    const pingServer = async () => {
      try {
        const res = await fetch('/api/online-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicKey })
        });
        const { onlineUsers } = await res.json();
        setOnlineUsers(new Set(onlineUsers));
      } catch (err) {
        console.error('Failed to update online status:', err);
      }
    };

    // Ping immediately
    pingServer();

    // Then ping every 10 seconds
    const interval = setInterval(pingServer, 10000);

    // Poll for other online users every 5 seconds
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/online-users');
        const { onlineUsers } = await res.json();
        setOnlineUsers(new Set(onlineUsers));
      } catch (err) {
        console.error('Failed to fetch online users:', err);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(pollInterval);
    };
  }, [publicKey]);

  // Add new function to fetch undelivered messages
  const fetchUndeliveredMessages = async () => {
    if (!publicKey) return;

    try {
      const response = await fetch(`/api/messages?address=${publicKey}`);
      const messages = await response.json();

      // Process each undelivered message
      for (const msg of messages) {
        try {
          // Get recipient's private key from Phantom
          const privateKey = await window.phantom.solana.request({
            method: 'signMessage',
            params: {
              message: 'Decrypt incoming message',
              display: 'utf8'
            }
          });

          // Decrypt message
          const decryptedText = await decrypt(
            msg.content,
            privateKey,
            msg.fromAddress
          );

          // Add to messages state
          setMessages(prev => ({
            ...prev,
            [msg.fromAddress]: [
              ...(prev[msg.fromAddress] || []),
              {
                ...msg,
                text: decryptedText,
                decrypted: true
              }
            ]
          }));

          // Mark message as delivered
          await fetch(`/api/messages/${msg.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delivered: true })
          });

          // Update unread count
          setUnreadCounts(prev => ({
            ...prev,
            [msg.fromAddress]: (prev[msg.fromAddress] || 0) + 1
          }));
        } catch (error) {
          console.error('Failed to process message:', error);
        }
      }
    } catch (error) {
      console.error('Failed to fetch undelivered messages:', error);
    }
  };

  // Update handleSendMessage to use new messages endpoint
  const handleSendMessage = async (e, recipient) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    try {
      // Get sender's private key from Phantom
      const privateKey = await window.phantom.solana.request({
        method: 'signMessage',
        params: {
          message: 'Generate message encryption keys',
          display: 'utf8'
        }
      });

      // Encrypt message
      const encryptedText = await encrypt(
        messageInput,
        recipient,
        privateKey
      );

      const timestamp = Date.now();
      const message = {
        from: publicKey,
        text: encryptedText,
        timestamp,
        delivered: false,
        encrypted: true
      };

      // Add to local state immediately
      setMessages(prev => ({
        ...prev,
        [recipient]: [...(prev[recipient] || []), message]
      }));

      // Send to messages API
      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: publicKey,
            to: recipient,
            text: encryptedText,
            timestamp,
            encrypted: true
          })
        });

        if (response.ok) {
          setMessageInput('');
          // Update message as delivered
          setMessages(prev => ({
            ...prev,
            [recipient]: prev[recipient].map(msg => 
              msg.timestamp === timestamp ? {...msg, delivered: true} : msg
            )
          }));
        }
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    } catch (error) {
      console.error('Encryption failed:', error);
      setStatus('Failed to encrypt message');
    }
  };

  // Add effect to fetch undelivered messages on connect
  useEffect(() => {
    if (isConnected && publicKey) {
      fetchUndeliveredMessages();
    }
  }, [isConnected, publicKey]);

  // Add disconnect handler
  const handleDisconnect = async () => {
    try {
      await window.phantom.solana.disconnect();
      // Remove ourselves from online users
      if (publicKey) {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.delete(publicKey);
          return next;
        });
      }
      setIsConnected(false);
      setPublicKey(null);
      setBalance(null);
      setHasPaid(false);
      setStatus('');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  // Add function to clear unread when opening chat
  const handleOpenChat = (address) => {
    setActiveChat(address);
    // Clear unread count when opening chat
    setUnreadCounts(prev => ({
      ...prev,
      [address]: 0
    }));
  };

  // Add inbox click handler
  const handleInboxClick = (address) => {
    setShowInbox(true);
    setActiveChat(address);
  };

  // Add helper function to get total unread
  const getTotalUnread = () => {
    return Object.values(unreadCounts).reduce((a, b) => a + b, 0);
  };

  // Add at the top with other useEffects
  useEffect(() => {
    // Load nicknames when app starts
    const savedNicknames = localStorage.getItem('tribify-nicknames');
    if (savedNicknames) {
      setNicknames(JSON.parse(savedNicknames));
    }
  }, []);

  // Add effect to save nicknames when they change
  useEffect(() => {
    // Save nicknames whenever they change
    localStorage.setItem('tribify-nicknames', JSON.stringify(nicknames));
  }, [nicknames]);

  // Add backup/restore functions
  const backupNicknames = () => {
    const data = JSON.stringify(nicknames);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tribify-nicknames-backup.json';
    a.click();
  };

  const restoreNicknames = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const restored = JSON.parse(e.target.result);
          setNicknames(restored);
          setStatus('Nicknames restored successfully!');
        } catch (error) {
          setStatus('Error restoring nicknames. Is this a valid backup file?');
        }
      };
      reader.readAsText(file);
    }
  };

  // Update nickname submit to use custom dialog
  const handleNicknameSubmit = (e, address) => {
    e.preventDefault();
    const nickname = e.target.nickname.value;
    
    setDialogConfig({
      show: true,
      onConfirm: () => {
        const updatedNicknames = {...nicknames, [address]: nickname};
        setNicknames(updatedNicknames);
        setStatus('Nickname saved! Remember to backup your nicknames to keep them safe.');
        setEditingNickname(null);
      }
    });
  };

  useEffect(() => {
    if (isConnected) {
      fetchTokenHolders();
    }
  }, [isConnected]);

  // Add auto-reconnect on page load
  useEffect(() => {
    const autoConnect = async () => {
      try {
        if (window.phantom?.solana?.isConnected) {
          const resp = await window.phantom.solana.connect({ onlyIfTrusted: true });
          const userPublicKey = resp.publicKey.toString();
          setIsConnected(true);
          setPublicKey(userPublicKey);
          await updateBalance(userPublicKey);
          await fetchTokenHolders();
        }
      } catch (error) {
        console.log('No existing connection');
      }
    };

    autoConnect();
  }, []);

  // Add tribify prompt handler
  const handleTribifyPrompt = async (e) => {
    e.preventDefault();
    if (!tribifyInput.trim()) return;

    // Add user input to responses
    setTribifyResponses(prev => [...prev, {
      type: 'input',
      text: tribifyInput
    }]);

    try {
      // Add "thinking" message
      setTribifyResponses(prev => [...prev, {
        type: 'system',
        text: '...'
      }]);

      // Call AI endpoint
      const response = await fetch('/api/tribify/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: tribifyInput })
      });

      const data = await response.json();

      // Replace "thinking" with response
      setTribifyResponses(prev => [
        ...prev.slice(0, -1),
        {
          type: 'response',
          text: data.response
        }
      ]);

      setTribifyInput('');
    } catch (error) {
      console.error('Failed to get AI response:', error);
      // Replace "thinking" with error
      setTribifyResponses(prev => [
        ...prev.slice(0, -1),
        {
          type: 'error',
          text: 'Failed to get response. Please try again.'
        }
      ]);
    }
  };

  return (
    <div className={`App ${isDark ? 'dark' : 'light'}`}>
      <ThemeToggle isDark={isDark} onToggle={handleThemeToggle} />
      <div className="connection-group">
        <button onClick={handleConnection}>
          {isConnected ? 'Connected' : 'Connect Wallet'}
        </button>
        {isConnected && (
          <>
            <button 
              className="refresh-button"
              onClick={async () => {
                if (publicKey === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv') {
                  fetchTreasuryBalances();
                  fetchTokenHolders();
                  setStatus('Treasury balances updated');
                } else {
                  try {
                    await updateBalance(publicKey);
                    await fetchTokenHolders();
                    setStatus('Balances updated');
                  } catch (error) {
                    setStatus('Error updating balances');
                  }
                }
              }}
            >
              Refresh
            </button>
            <button 
              className="password-button"
              onClick={async () => {
                if (friendPassword) {
                  // Has password - show change form
                  setDialogConfig({
                    show: true,
                    message: (
                      <>
                        <h3>Password</h3>
                        <div className="password-form">
                          {/* Username field that Chrome's password manager will use */}
                          <div className="password-field">
                            <label>Username</label>
                            <input 
                              type="text"
                              name="username"
                              value={publicKey}
                              readOnly
                            />
                          </div>
                          <div className="password-field">
                            <label>Current Password</label>
                            <input 
                              type="text" 
                              value={friendPassword}
                              disabled
                              style={{ opacity: 0.7 }}
                            />
                          </div>
                          <div className="password-field">
                            <label>New Password</label>
                            <input 
                              type="password"
                              id="newPassword"
                              name="password"
                              autoComplete="new-password"
                              placeholder="Enter new password"
                            />
                          </div>
                          <div className="password-field">
                            <label>Confirm New Password</label>
                            <input 
                              type="password"
                              id="confirmPassword"
                              name={`${publicKey}-confirm`}  // Unique name for confirm field
                              autoComplete="new-password"
                              placeholder="Confirm new password"
                            />
                          </div>
                        </div>
                      </>
                    ),
                    onConfirm: async () => {
                      const newPassword = document.getElementById('newPassword').value;
                      const confirmPassword = document.getElementById('confirmPassword').value;

                      if (newPassword !== confirmPassword) {
                        setStatus('New passwords do not match');
                        return;
                      }

                      try {
                        // Payment for password change
                        setStatus('Please approve payment (0.001 SOL) to change your password...');
                        const transaction = new Transaction().add(
                          SystemProgram.transfer({
                            fromPubkey: new PublicKey(publicKey),
                            toPubkey: new PublicKey('DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv'),
                            lamports: LAMPORTS_PER_SOL * 0.001
                          })
                        );

                        const { blockhash } = await connection.getLatestBlockhash('processed');
                        transaction.recentBlockhash = blockhash;
                        transaction.feePayer = new PublicKey(publicKey);
                        const signed = await window.phantom.solana.signTransaction(transaction);
                        await connection.sendRawTransaction(signed.serialize());

                        localStorage.setItem('friend_password', newPassword);
                        setFriendPassword(newPassword);
                        setStatus('Password updated successfully!');
                      } catch (error) {
                        setStatus('Failed to change password: ' + error.message);
                      }
                    },
                    confirmText: 'Buy New Password ($1)'
                  });
                } else {
                  // No password - offer to create
                  setDialogConfig({
                    show: true,
                    message: (
                      <>
                        <h3>Create Password</h3>
                        <p>Would you like to create a password? This will cost 0.001 SOL.</p>
                        <p className="dialog-note">A password lets you access special features.</p>
                      </>
                    ),
                    onConfirm: async () => {
                      try {
                        // Payment for new password
                        setStatus('Please approve payment (0.001 SOL) to create your password...');
                        const transaction = new Transaction().add(
                          SystemProgram.transfer({
                            fromPubkey: new PublicKey(publicKey),
                            toPubkey: new PublicKey('DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv'),
                            lamports: LAMPORTS_PER_SOL * 0.001
                          })
                        );

                        const { blockhash } = await connection.getLatestBlockhash('processed');
                        transaction.recentBlockhash = blockhash;
                        transaction.feePayer = new PublicKey(publicKey);
                        const signed = await window.phantom.solana.signTransaction(transaction);
                        await connection.sendRawTransaction(signed.serialize());

                        // After payment, set password
                        const newPassword = prompt('Payment received! Enter your password:');
                        if (newPassword) {
                          localStorage.setItem('friend_password', newPassword);
                          setFriendPassword(newPassword);
                          setStatus('Password created successfully!');
                        }
                      } catch (error) {
                        setStatus('Failed to create password: ' + error.message);
                      }
                    }
                  });
                }
              }}
            >
              Password
            </button>
            <button 
              className="messages-button"
              onClick={() => setShowAllMessages(true)}
            >
              Messages {getTotalUnread() > 0 ? `(${getTotalUnread()})` : ''}
            </button>
            <button onClick={backupNicknames}>Backup</button>
            <label className="restore-button">
              Restore
              <input 
                type="file" 
                accept=".json"
                style={{ display: 'none' }}
                onChange={restoreNicknames}
              />
            </label>
            <button 
              className="tribify-button"
              onClick={() => setShowTribifyPrompt(true)}
            >
              /tribify.ai
            </button>
            <button className="disconnect-button" onClick={handleDisconnect}>
              Disconnect
            </button>
          </>
        )}
      </div>

      {isConnected && (
        <>
          <div className="wallet-info">
            <div>
              ◈ {publicKey}
              {publicKey === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv' && (
                <span style={{color: '#2ecc71'}}> (Treasury)</span>
              )}
            </div>
            <div>◇ {balance} SOL</div>
            {tokenHolders.find(h => h.address === publicKey)?.tokenBalance && (
              <div>◇ {tokenHolders.find(h => h.address === publicKey).tokenBalance.toLocaleString()} $TRIBIFY</div>
            )}
            {tokenHolders.find(h => h.address === publicKey)?.usdcBalance > 0 && (
              <div>◇ ${tokenHolders.find(h => h.address === publicKey).usdcBalance.toLocaleString()} USDC</div>
            )}
          </div>

          <div className="main-layout">
            <div className="token-holders">
              <h3>$TRIBIFY Holders</h3>
              {tokenHolders.map((holder) => (
                <div key={holder.address} className="holder-item">
                  <div className="address-container">
                    <div>
                      ◈ {holder.address}
                      <div className="connection-status">
                        <span className={`status-indicator ${onlineUsers.has(holder.address) ? 'online' : 'offline'}`}>
                          ● {onlineUsers.has(holder.address) ? 'CONNECTED' : 'UNCONNECTED'}
                        </span>
                      </div>
                      <div style={{textAlign: 'left'}}>
                        <span style={{color: '#2ecc71'}}>
                          {holder.address === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv' && 'Treasury'}
                          {holder.address === '6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7' && (
                            <span>Pump.fun (Liquidity Pool)</span>
                          )}
                          {nicknames[holder.address] && nicknames[holder.address]}
                        </span>
                      </div>
                    </div>
                    <div className="actions">
                      {editingNickname === holder.address ? (
                        <form 
                          className="nickname-form"
                          onSubmit={(e) => handleNicknameSubmit(e, holder.address)}
                        >
                          <input 
                            name="nickname"
                            defaultValue={nicknames[holder.address] || 
                              (holder.address === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv' ? 'Treasury' :
                               holder.address === '6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7' ? 'Pump.fun' : '')}
                            placeholder="Enter nickname"
                            autoFocus
                          />
                          <button type="submit">✓</button>
                        </form>
                      ) : (
                        <>
                          <div 
                            className="nickname"
                            onClick={() => setEditingNickname(holder.address)}
                          >
                            {nicknames[holder.address] || 
                             holder.address === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv' ? '- Treasury' :
                             holder.address === '6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7' ? '- Pump.fun' :
                             '+ Add nickname'}
                          </div>
                          <div 
                            className="send-message"
                            onClick={() => handleOpenChat(holder.address)}
                          >
                            + Send message
                          </div>
                          <div 
                            className="inbox-status"
                            onClick={() => handleInboxClick(holder.address)}
                          >
                            {unreadCounts[holder.address] || '0'} unread messages
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="balances">
                    <div>
                      ◇ {(holder.tokenBalance || 0).toLocaleString()} $TRIBIFY {' '}
                        <span className={`percentage`} style={{
                          color: getHolderColor(holder.address, holder.tokenBalance)
                        }}>
                          ({((holder.tokenBalance / TOTAL_SUPPLY) * 100).toFixed(4)}%)
                        </span>
                    </div>
                    <div>◇ {(holder.solBalance || 0).toLocaleString()} SOL</div>
                    <div>◇ ${(holder.usdcBalance || 0).toLocaleString()} USDC</div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <TokenHolderGraph 
                holders={tokenHolders}
                onNodeClick={handleOpenChat}
              />

              <div className="connection-status-panel">
                <h3>Connection Status</h3>
                <div className="debug-grid">
                  <div className="debug-item">
                    <div className="debug-label">State:</div>
                    <div className={`debug-value state-${debugState.connectionState}`}>
                      {debugState.connectionState}
                    </div>
                  </div>
                  <div className="debug-item">
                    <div className="debug-label">Socket ID:</div>
                    <div className="debug-value">{debugState.socketId || 'none'}</div>
                  </div>
                  <div className="debug-item">
                    <div className="debug-label">Auth Attempts:</div>
                    <div className="debug-value">{debugState.authAttempts}</div>
                  </div>
                  <div className="debug-item">
                    <div className="debug-label">My Public Key:</div>
                    <div className="debug-value">{publicKey || 'none'}</div>
                  </div>
                  <div className="debug-item">
                    <div className="debug-label">Online Users:</div>
                    <div className="debug-value">{onlineUsers.size}</div>
                  </div>
                  {debugState.lastAuthError && (
                    <div className="debug-item error">
                      <div className="debug-label">Last Error:</div>
                      <div className="debug-value">{debugState.lastAuthError.message}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {(activeChat || showInbox) && (
              <div className="chat-box">
                <div className="chat-header">
                  <div>
                    {showInbox ? (
                      <>Inbox: {nicknames[activeChat] || activeChat}</>
                    ) : (
                      <>Chat with: {nicknames[activeChat] || activeChat}</>
                    )}
                  </div>
                  <button onClick={() => {
                    setActiveChat(null);
                    setShowInbox(false);
                  }}>×</button>
                </div>
                <div className="chat-messages">
                  {(messages[activeChat] || []).map((msg, i) => (
                    <div 
                      key={i} 
                      className={`message ${msg.from === publicKey ? 'sent' : 'received'} ${
                        msg.delivered ? 'delivered' : ''
                      } ${msg.encrypted ? 'encrypted' : ''} ${msg.decrypted ? 'decrypted' : ''}`}
                    >
                      {msg.text}
                      {msg.encrypted && !msg.decrypted && (
                        <span className="encryption-status">🔒</span>
                      )}
                      {msg.decrypted && (
                        <span className="encryption-status">🔓</span>
                      )}
                    </div>
                  ))}
                </div>
                <form className="chat-input" onSubmit={(e) => handleSendMessage(e, activeChat)}>
                  <input 
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    autoFocus
                  />
                  <button type="submit">Send</button>
                </form>
              </div>
            )}
          </div>

          {!showDocs ? (
            <button onClick={() => setShowDocs(true)} className="docs-link">
              View Documentation
            </button>
          ) : (
            <div className="docs-content">
              <button onClick={() => setShowDocs(false)}>← Back</button>
              <div className="markdown-content">
                {DOCS_CONTENT.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          )}

          {showAllMessages && (
            <div className="messages-box">
              <div className="messages-header">
                <h3>Messages</h3>
                <button onClick={() => setShowAllMessages(false)}>×</button>
              </div>
              <div className="messages-list">
                {getTotalUnread() === 0 ? (
                  <div className="empty-messages">
                    No Messages! Your inbox is empty!
                  </div>
                ) : (
                  tokenHolders.map(holder => (
                    unreadCounts[holder.address] > 0 && (
                      <div key={holder.address} className="message-item" onClick={() => {
                        handleInboxClick(holder.address);
                        setShowAllMessages(false);
                      }}>
                        <div className="message-from">
                          {nicknames[holder.address] || holder.address}
                        </div>
                        <div className="unread-count">
                          {unreadCounts[holder.address]} unread
                        </div>
                      </div>
                    )
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {status && (
        <div className="status">
          {status}
        </div>
      )}

      {dialogConfig.show && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <div className="dialog-content">
              {dialogConfig.message}
            </div>
            <div className="dialog-buttons">
              <button onClick={() => {
                dialogConfig.onConfirm?.();
                setDialogConfig({ show: false });
              }}>
                {/* Check if we're in a login form */}
                {document.getElementById('loginForm') ? 'Login' : 'Save'}
              </button>
              <button onClick={() => {
                setDialogConfig({ show: false });
                setEditingNickname(null);
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add tribify prompt box */}
      {showTribifyPrompt && (
        <div className="ai-terminal">
          <div className="terminal-header">
            <span>/tribify.ai</span>
            <button onClick={() => setShowTribifyPrompt(false)}>×</button>
          </div>
          <div className="terminal-content">
            {tribifyResponses.map((response, i) => (
              <div key={i} className={`terminal-message ${response.type}`}>
                {response.type === 'input' && '> '}
                {response.text}
              </div>
            ))}
          </div>
          <form className="terminal-input" onSubmit={handleTribifyPrompt}>
            <input 
              type="text"
              value={tribifyInput}
              onChange={(e) => setTribifyInput(e.target.value)}
              placeholder="Enter a prompt..."
              autoFocus
            />
          </form>
        </div>
      )}
    </div>
  );
}

export default App; 