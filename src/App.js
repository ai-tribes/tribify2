import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3-force';
import Pusher from 'pusher-js';
import { encrypt, decrypt } from './lib/encryption';
import Connected from './components/Connected';
import Password from './components/Password';
import Messages from './components/Messages';
import Backup from './components/Backup';
import Restore from './components/Restore';
import Disconnect from './components/Disconnect';
import { Link, useNavigate } from 'react-router-dom';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { clusterApiUrl } from '@solana/web3.js';
import HamburgerMenu from './components/HamburgerMenu';
import TokenHolderGraph from './components/TokenHolderGraph';

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

// Add USDC mint constant at the top with other constants
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

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

// Add this component before the App component
const HoldersList = ({ holders, onNodeClick, nicknames, setNicknames }) => {
  const [editingNickname, setEditingNickname] = useState(null);

  // Sort holders by token balance in descending order
  const sortedHolders = [...holders].sort((a, b) => b.tokenBalance - a.tokenBalance);

  return (
    <div className="holders-list">
      <div className="holder-header">
        <div className="holder-col address">Address</div>
        <div className="holder-col percent">Share</div>
        <div className="holder-col name">Name</div>
        <div className="holder-col balance">$TRIBIFY</div>
        <div className="holder-col sol">SOL</div>
        <div className="holder-col usdc">USDC</div>
        <div className="holder-col message">Message</div>
      </div>
      {sortedHolders.map((holder) => (
        <div key={holder.address} className="holder-item">
          <div className="holder-col address">
            ◈ {holder.address}
          </div>
          <div className="holder-col percent" style={{
            color: getHolderColor(holder.address, holder.tokenBalance)
          }}>
            {((holder.tokenBalance / TOTAL_SUPPLY) * 100).toFixed(4)}%
          </div>
          <div className="holder-col name">
            {editingNickname === holder.address ? (
              <input
                autoFocus
                defaultValue={nicknames[holder.address] || ''}
                onBlur={(e) => {
                  setNicknames(prev => ({...prev, [holder.address]: e.target.value}));
                  setEditingNickname(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setNicknames(prev => ({...prev, [holder.address]: e.target.value}));
                    setEditingNickname(null);
                  }
                }}
              />
            ) : (
              <span onClick={() => setEditingNickname(holder.address)}>
                {nicknames[holder.address] || '+ Add name'}
              </span>
            )}
          </div>
          <div className="holder-col balance">
            {holder.tokenBalance.toLocaleString()}
          </div>
          <div className="holder-col sol">
            {holder.solBalance?.toFixed(4) || '0.0000'}
          </div>
          <div className="holder-col usdc">
            $ {holder.usdcBalance?.toFixed(2) || '0.00'}
          </div>
          <div className="holder-col message">
            {holder.address !== '6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7' && (
              <button onClick={() => onNodeClick(holder.address)}>
                Message
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Add MessageModal component
const MessageModal = ({ isOpen, onClose, recipient, recipientName, messages, onSendMessage }) => {
  const [messageInput, setMessageInput] = useState('');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="message-modal">
        <div className="modal-header">
          <h3>Message {recipientName || recipient}</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="message-content">
          {(messages || []).map((msg, i) => (
            <div 
              key={i} 
              className={`message ${msg.from === recipient ? 'received' : 'sent'} ${
                msg.delivered ? 'delivered' : ''
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>
        <form className="message-input" onSubmit={(e) => {
          e.preventDefault();
          onSendMessage(messageInput);
          setMessageInput('');
        }}>
          <input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            autoFocus
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
};

function App() {
  const navigate = useNavigate();
  // Add all state declarations at the top of App
  const [isLoading, setIsLoading] = useState(false);
  const [wallets, setWallets] = useState([]);
  const [publicKey, setPublicKey] = useState(null);
  const [tokenHolders, setTokenHolders] = useState([]);
  const [isRandomized, setIsRandomized] = useState(true);
  const [status, setStatus] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [balance, setBalance] = useState(null);
  const [showDocs, setShowDocs] = useState(false);
  const [nicknames, setNicknames] = useState({
    'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv': 'Treasury',
    '6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7': 'Liquidity Pool'
  });
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

  // Update the initial tribifyResponses state
  const [tribifyResponses, setTribifyResponses] = useState([
    {
      type: 'response',
      text: `Welcome to /tribify.ai! 👋

I'm your AI assistant for navigating the Tribify platform. Here's a quick guide:

Navigation:
• Use the buttons at the top to switch between views
• /tribify.ai (current view) - Chat with AI for help and information
• Shareholders - View all token holders and their balances
• Wallet - Manage your wallets and transactions

Commands you can try:
• /help - Show this message again
• /holders - Get information about shareholders
• /wallet - Learn about wallet features
• /buy - Understand how to buy tokens
• /sell - Learn about selling tokens
• /distribute - Learn about token distribution

You can also ask me questions in natural language about any aspect of Tribify.

How can I help you get started?`
    }
  ]);
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

  // Move isCollapsed state from TokenHolderGraph to App
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Add new state near the top with other states
  const [showStatus, setShowStatus] = useState(false);

  // Add state for message modal
  const [messageModal, setMessageModal] = useState({ 
    isOpen: false, 
    recipient: null 
  });

  // Add state to control views (near other state declarations)
  const [activeView, setActiveView] = useState('ai'); // Options: 'ai', 'holders', 'graph'

  // Define WalletTable component inside App to access state and functions
  const WalletTable = ({ wallets, onCopy }) => {
    if (isLoading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">Fetching wallet balances...</div>
        </div>
      );
    }

    return (
      <div className="wallet-container">
        <div className="wallet-controls">
          <button 
            className="refresh-button"
            onClick={refreshWallets}
            disabled={wallets.length === 0}
          >
            ↻ Refresh Balances
          </button>
        </div>
        <div className="wallet-table">
          <div className="table-header">
            <div className="col-index">#</div>
            <div className="col-private">Address</div>
            <div className="col-public">$Tribify Shareholders</div>
            <div className="col-tribify">Share</div>
            <div className="col-sol">SOL</div>
            <div className="col-usdc">USDC</div>
            <div className="col-message">Message</div>
          </div>
          {wallets.map((wallet, index) => (
            <div key={index} className="table-row">
              <span className="col-index">{index + 1}</span>
              <span 
                className="col-private" 
                onClick={() => onCopy(wallet.privateKey, 'private')}
              >
                {wallet.privateKey}
              </span>
              <span 
                className="col-public" 
                onClick={() => onCopy(wallet.publicKey, 'public')}
              >
                {wallet.publicKey}
              </span>
              <span className="col-tribify">
                {wallet.tribifyBalance || 0} TRIBIFY
              </span>
              <span className="col-sol">
                {(wallet.solBalance || 0).toFixed(4)} SOL
              </span>
              <span className="col-usdc">
                ${(wallet.usdcBalance || 0).toFixed(2)}
              </span>
              <span className="col-message">
                {wallet.address !== '6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7' && (
                  <button onClick={() => onCopy(wallet.address, 'address')}>
                    Message
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Define refresh function
  const refreshWallets = async () => {
    if (wallets.length === 0) return;
    
    setIsLoading(true);
    try {
      const updatedWallets = await fetchBalances(wallets);
      setWallets(updatedWallets);
      setStatus('Balances refreshed successfully');
    } catch (error) {
      console.error('Error refreshing balances:', error);
      setStatus('Error refreshing balances: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Update Pusher initialization code
  const pusher = React.useMemo(() => {
    if (!publicKey) return null;

    const pusherClient = new Pusher(process.env.REACT_APP_PUSHER_KEY, {
      cluster: process.env.REACT_APP_PUSHER_CLUSTER,
      authEndpoint: process.env.NODE_ENV === 'production'
        ? 'https://tribify-richardboase-ai-tribes.vercel.app/api/pusher/auth'  // Production
        : 'http://localhost:3001/api/pusher/auth',  // Development
      auth: {
        headers: { 'Content-Type': 'application/json' },
        params: { publicKey }
      }
    });

    const channel = pusherClient.subscribe('presence-tribify');
    
    channel.bind('pusher:subscription_succeeded', (members) => {
      console.log('Subscription succeeded:', members);
      const online = new Set();
      members.each(member => online.add(member.id));
      setOnlineUsers(online);
    });

    return pusherClient;
  }, [publicKey]);

  // Core functions
  const handleConnection = async () => {
    try {
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
      const usdcMint = new PublicKey(USDC_MINT);
      
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
      
      // Randomize the order of holders before setting state
      const randomizedHolders = holders
        .filter(h => h.tokenBalance > 0)
        .sort(() => Math.random() - 0.5);
        
      setTokenHolders(randomizedHolders);
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
      const usdcMint = new PublicKey(USDC_MINT);
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

  // Update handleOpenChat
  const handleOpenChat = (address) => {
    setMessageModal({
      isOpen: true,
      recipient: address
    });
  };

  // Add handleCloseChat
  const handleCloseChat = () => {
    setMessageModal({
      isOpen: false,
      recipient: null
    });
  };

  // Add handleSendMessage
  const handleSendMessage = (message) => {
    if (!messageModal.recipient || !message.trim()) return;
    
    // Your existing message sending logic here
    console.log('Sending message to:', messageModal.recipient, message);
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
    setTribifyResponses(prev => [...prev, { type: 'input', text: tribifyInput }]);
    
    // Process the command
    const input = tribifyInput.toLowerCase().trim();
    let response = '';

    // Handle commands
    if (input.startsWith('/')) {
      switch (input) {
        case '/help':
          response = `Available commands:
• /help - Show this help message
• /holders - View shareholder information
• /wallet - Learn about wallet features
• /buy - Get buying instructions
• /sell - Get selling instructions
• /distribute - Learn about token distribution
• /stats - View current statistics`;
          break;

        case '/holders':
          const totalHolders = tokenHolders.length;
          const totalSupply = tokenHolders.reduce((sum, h) => sum + h.tokenBalance, 0);
          response = `Shareholder Statistics:
• Total Holders: ${totalHolders}
• Total Supply: ${totalSupply.toLocaleString()} $TRIBIFY
• Largest Holder: ${tokenHolders[0]?.tokenBalance.toLocaleString()} $TRIBIFY
• Treasury Balance: ${tokenHolders.find(h => h.address === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv')?.tokenBalance.toLocaleString()} $TRIBIFY

Use the Shareholders button to view the complete list.`;
          break;

        case '/wallet':
          response = `Wallet Features:
1. Generate Keys - Create new wallets
2. Download Keys - Backup your wallet data
3. Restore Keys - Recover from backup
4. Fund Wallets - Distribute funds
5. Configure Buy/Sell - Set up automated trading
6. Buy/Sell Sequence - Execute trades
7. Distribute Tokens - Send tokens to multiple wallets

Need more details about any feature? Just ask!`;
          break;

        case '/buy':
          response = `How to Buy $TRIBIFY:

1. Configure Buy Settings:
   • Set amount range (min/max)
   • Choose number of wallets
   • Set time interval
   • Adjust slippage and fees

2. Start Buying:
   • Use "Buy Sequence" for automated purchases
   • Monitor transactions in real-time
   • View balances in wallet page

Need help with specific settings? Just ask!`;
          break;

        case '/sell':
          response = `How to Sell $TRIBIFY:

1. Configure Sell Settings:
   • Set amount range (min/max)
   • Choose number of wallets
   • Set time interval
   • Adjust slippage and fees

2. Start Selling:
   • Use "Sell Sequence" for automated sales
   • Monitor transactions in real-time
   • Track proceeds in wallet page

Need help with specific settings? Just ask!`;
          break;

        case '/distribute':
          response = `Token Distribution Guide:

1. Access Distribution:
   • Click "Distribute Tokens" button
   • Choose source wallet (parent or external)
   • Set distribution parameters

2. Distribution Options:
   • Fixed amount per wallet
   • Random amounts within range
   • Scheduled distribution
   • Batch processing

Need help setting up distribution? Just ask!`;
          break;

        default:
          response = "I don't recognize that command. Try /help to see available commands.";
      }
    } else {
      // Handle natural language queries
      if (input.includes('buy') || input.includes('purchase')) {
        response = "To buy tokens, you can use the Configure Buy button to set up your purchase parameters, or use /buy for more details.";
      } else if (input.includes('sell')) {
        response = "To sell tokens, you can use the Configure Sell button to set up your sale parameters, or use /sell for more details.";
      } else if (input.includes('wallet') || input.includes('keys')) {
        response = "The Wallet page lets you manage your keys, fund wallets, and execute trades. Use /wallet for more details.";
      } else if (input.includes('holder') || input.includes('shareholder')) {
        response = "You can view all shareholders and their balances using the Shareholders button. Use /holders for statistics.";
      } else {
        response = "I'm not sure about that. Try asking about buying, selling, wallets, or shareholders, or use /help to see available commands.";
      }
    }

    // Add AI response
    setTribifyResponses(prev => [...prev, { type: 'response', text: response }]);
    
    // Clear input
    setTribifyInput('');
  };

  // Move generateWallets inside App component
  const generateWallets = async (count) => {
    const wallets = [];
    for (let i = 0; i < count; i++) {
      const keypair = Keypair.generate();
      const wallet = {
        privateKey: bs58.encode(keypair.secretKey),
        publicKey: keypair.publicKey.toBase58(),
        solBalance: 0,
        usdcBalance: 0,
        tribifyBalance: 0
      };
      wallets.push(wallet);
    }

    // Fetch balances for all wallets
    const updatedWallets = await fetchBalances(wallets);
    setWallets(updatedWallets);
  };

  // Move fetchBalances inside App component
  const fetchBalances = async (wallets) => {
    const connection = new Connection(clusterApiUrl('mainnet-beta'));
    const usdcMint = new PublicKey(USDC_MINT);

    return Promise.all(wallets.map(async (wallet) => {
      try {
        // Fetch SOL balance
        const solBalance = await connection.getBalance(new PublicKey(wallet.publicKey));
        
        // Fetch USDC balance
        let usdcBalance = 0;
        try {
          const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            new PublicKey(wallet.publicKey),
            { mint: usdcMint }
          );
          if (tokenAccounts.value.length > 0) {
            usdcBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
          }
        } catch (e) {
          console.error('Error fetching USDC balance:', e);
        }

        return {
          ...wallet,
          solBalance: solBalance / LAMPORTS_PER_SOL,
          usdcBalance: usdcBalance
        };
      } catch (e) {
        console.error('Error fetching balances:', e);
        return wallet;
      }
    }));
  };

  return (
    <div className="App">
      {!isConnected && (
        <div className="connection-group">
          <div className="tribify-text">/tribify.ai</div>
          <button onClick={handleConnection}>Connect</button>
        </div>
      )}

      {isConnected && (
        <>
          <div className="desktop-nav">
            <button 
              className="tribify-button" 
              onClick={() => setActiveView('ai')}
            >
              /tribify.ai
            </button>
            <button 
              className="holders-button"
              onClick={() => setActiveView('holders')}
            >
              Shareholders
            </button>
            <button 
              className="wallet-button"
              onClick={() => navigate('/wallet')}
            >
              Wallet
            </button>
            <Password onClick={() => {
              if (friendPassword) {
                // Has password - show change form
                setDialogConfig({
                  show: true,
                  message: (
                    <>
                      <h3>Change Password</h3>
                      <div className="password-form">
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
                            name={`${publicKey}-confirm`}
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
                  confirmText: 'Change Password'
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
                  },
                  confirmText: 'Yes, Create Password',
                  cancelText: 'No, Cancel'
                });
              }
            }} />
            <Messages onClick={() => setShowAllMessages(true)} />
            <Backup onClick={backupNicknames} />
            <Restore onClick={() => document.getElementById('restore-input').click()} />
            <button className="docs-button" onClick={() => setShowDocs(!showDocs)}>Docs</button>
            <button 
              className="graph-toggle-button" 
              onClick={() => setActiveView('graph')}
            >
              Graph
            </button>
            <button className="status-toggle-button" onClick={() => setShowStatus(!showStatus)}>Connection</button>
            <Disconnect onClick={handleDisconnect} />
          </div>

          <div className="user-info-card">
            <div className="user-info-content">
              <span className="user-address">◈ {publicKey}</span>
              {publicKey === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv' && (
                <span className="user-label">(Treasury)</span>
              )}
              <span className="balance-dot">•</span>
              <span className="balance-item">
                {tokenHolders.find(h => h.address === publicKey)?.tokenBalance.toLocaleString()} $TRIBIFY
              </span>
              <span className="balance-dot">•</span>
              <span className="balance-item">{balance} SOL</span>
              <span className="balance-dot">•</span>
              <span className="balance-item">
                ${tokenHolders.find(h => h.address === publicKey)?.usdcBalance.toLocaleString()} USDC
              </span>
            </div>
          </div>

          <div className="main-layout">
            {activeView === 'ai' && (
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

            {activeView === 'holders' && (
              <div className="token-holders">
                <h3>$Tribify Shareholders</h3>
                <HoldersList 
                  holders={tokenHolders}
                  onNodeClick={handleOpenChat}
                  nicknames={nicknames}
                  setNicknames={setNicknames}
                />
              </div>
            )}

            {activeView === 'graph' && (
              <div className="graph-container">
                <TokenHolderGraph 
                  holders={tokenHolders.map(holder => ({
                    id: holder.address,
                    value: holder.tokenBalance,
                    name: nicknames[holder.address] || holder.address,
                    address: holder.address
                  }))}
                  width={window.innerWidth - 40}  // Full width minus margins
                  height={window.innerHeight - 200}  // Full height minus header space
                />
              </div>
            )}

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

      {showStatus && (
        <div className="connection-status-panel">
          <div className="status-details">
            <div className="status-item">
              <span className="status-label">Connection State:</span>
              <span className={`status-value ${debugState.connectionState}`}>
                {debugState.connectionState}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Socket ID:</span>
              <span className="status-value">{debugState.socketId || 'Not connected'}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Auth Attempts:</span>
              <span className="status-value">{debugState.authAttempts}</span>
            </div>
            {debugState.lastAuthError && (
              <div className="status-item error">
                <span className="status-label">Last Error:</span>
                <span className="status-value error">{debugState.lastAuthError}</span>
              </div>
            )}
            <div className="status-item">
              <span className="status-label">Online Users:</span>
              <span className="status-value">
                {Array.from(onlineUsers).join(', ') || 'None'}
              </span>
            </div>
            <div className="status-actions">
              <button onClick={() => {
                if (socket) {
                  socket.disconnect();
                  socket.connect();
                }
              }}>
                Reconnect
              </button>
            </div>
          </div>
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
                {dialogConfig.confirmText || 'Save'}
              </button>
              <button onClick={() => {
                setDialogConfig({ show: false });
                setEditingNickname(null);
              }}>
                {dialogConfig.cancelText || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      <MessageModal 
        isOpen={messageModal.isOpen}
        onClose={handleCloseChat}
        recipient={messageModal.recipient}
        recipientName={messageModal.recipient ? nicknames[messageModal.recipient] : ''}
        messages={messageModal.recipient ? messages[messageModal.recipient] : []}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}

export default App; 