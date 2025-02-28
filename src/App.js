import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
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
import { Link, useNavigate, Route, Routes, useLocation, BrowserRouter } from 'react-router-dom';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { clusterApiUrl } from '@solana/web3.js';
import HamburgerMenu from './components/HamburgerMenu';
import TokenHolderGraph from './components/TokenHolderGraph';
import MessagesPage from './components/MessagesPage';
import StakeView from './components/StakeView';
import WalletPage from './components/WalletPage';
import Shareholders from './components/Shareholders';
import { TribifyContext } from './context/TribifyContext';
import Sign from './components/Sign';
import VotePage from './components/VotePage';
import SnipePage from './components/SnipePage';

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
const HoldersList = ({ holders, nicknames, setNicknames, setActiveView, publicKey, subwallets }) => {
  console.log('Subwallets received:', subwallets);
  console.log('Parent wallet:', publicKey);

  const [editingNickname, setEditingNickname] = useState(null);
  const [editingPublicName, setEditingPublicName] = useState(null);
  const [publicNames, setPublicNames] = useState(() => {
    const saved = localStorage.getItem('publicNames');
    return saved ? JSON.parse(saved) : {};
  });
  const [notification, setNotification] = useState(null);

  // Save public names whenever they change
  useEffect(() => {
    localStorage.setItem('publicNames', JSON.stringify(publicNames));
  }, [publicNames]);

  // Debug logging
  console.log('Parent wallet:', publicKey);
  
  // Get the subwallets from WalletPage's data
  const userWallets = new Set([
    publicKey,
    ...subwallets.map(wallet => wallet.publicKey.toString())  // Make sure we convert to string
  ]);

  console.log('User wallets set:', Array.from(userWallets));

  // Debug each holder
  const isUserWallet = (address) => {
    const isOwned = userWallets.has(address);
    console.log(`Checking ${address}: ${isOwned}`);
    return isOwned;
  };

  // Sort holders by token balance in descending order
  const sortedHolders = [...holders].sort((a, b) => b.tokenBalance - a.tokenBalance);

  // Add copy function
  const copyAddress = async (address) => {
    try {
      await navigator.clipboard.writeText(address);
      setNotification({
        message: 'Address copied to clipboard!',
        type: 'success'
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      setNotification({
        message: 'Failed to copy address',
        type: 'error'
      });
    }
  };

  // Function to handle public name verification
  const handlePublicNameVerification = async (address, newName) => {
    try {
      const message = `I am verifying that I own wallet ${address} and want to be known as "${newName}"`;
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await window.phantom.solana.signMessage(
        encodedMessage,
        'utf8'
      );

      if (signedMessage) {
        const updatedNames = {
          ...publicNames,
          [address]: {
            name: newName,
            signature: signedMessage,
            timestamp: Date.now() // Add timestamp for verification
          }
        };
        setPublicNames(updatedNames);
        localStorage.setItem('publicNames', JSON.stringify(updatedNames));
        setEditingPublicName(null);
      }
    } catch (error) {
      console.error('Verification failed:', error);
      alert('You must sign the message to verify ownership');
    }
  };

  return (
    <div className="holders-list">
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="holder-header">
        <div className="holder-col address">Address</div>
        <div className="holder-col percent">Share</div>
        <div className="holder-col name">Name</div>
        <div className="holder-col public-name">Public Name</div>
        <div className="holder-col balance">$TRIBIFY</div>
        <div className="holder-col sol">SOL</div>
        <div className="holder-col usdc">USDC</div>
        <div className="holder-col message">Message</div>
      </div>
      {sortedHolders.map((holder) => (
        <div 
          key={holder.address} 
          className={`holder-item ${isUserWallet(holder.address) ? 'user-owned' : ''}`}
        >
          <div 
            className="holder-col address clickable"
            onClick={() => copyAddress(holder.address)}
            title="Click to copy address"
          >
            {isUserWallet(holder.address) ? '🔑' : '◈'} {holder.address}
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
          <div className="holder-col public-name">
            {editingPublicName === holder.address ? (
              <input
                autoFocus
                defaultValue={publicNames[holder.address]?.name || ''}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    await handlePublicNameVerification(holder.address, e.target.value);
                  }
                }}
                onBlur={() => setEditingPublicName(null)}
                placeholder="Enter & sign to verify"
              />
            ) : (
              <span 
                onClick={() => {
                  // Only allow editing if it's user's wallet
                  if (isUserWallet(holder.address)) {
                    setEditingPublicName(holder.address);
                  }
                }}
                className={isUserWallet(holder.address) ? 'editable' : ''}
              >
                {publicNames[holder.address]?.name || 
                  (isUserWallet(holder.address) ? '+ Add public name' : '')}
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
            {holder.address === '6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7' ? (
              <button 
                className="message-all-button"
                onClick={() => {
                  // Get all holders except LP
                  const nonLpHolders = holders.filter(h => 
                    h.address !== '6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7' && 
                    h.tokenBalance > 0
                  );
                  setActiveView('messages');
                  // You'll need to implement the broadcast message functionality
                  // This could open a special message modal for broadcasting
                }}
              >
                Message All
              </button>
            ) : (
              holder.address !== '6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7' && (
                <button onClick={() => setActiveView('messages')}>
                  Message
                </button>
              )
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
  const location = useLocation();
  const [activeView, setActiveView] = useState('ai');
  const [isConnected, setIsConnected] = useState(false);
  const [tokenHolders, setTokenHolders] = useState([]);
  const [nicknames, setNicknames] = useState({});
  const [subwallets, setSubwallets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch token holders
  const fetchTokenHolders = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching token holders...');
      
      const mintPubkey = new PublicKey(TRIBIFY_TOKEN_MINT);
      const usdcMint = new PublicKey(USDC_MINT);
      
      // Get all token accounts for TRIBIFY
      const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey);
      
      if (!largestAccounts.value.length) {
        console.log('No token accounts found');
        setIsLoading(false);
        return;
      }

      console.log('Found token accounts:', largestAccounts.value.length);

      const holders = await Promise.all(
        largestAccounts.value.map(async (account) => {
          const accountInfo = await connection.getParsedAccountInfo(account.address);
          const address = accountInfo.value.data.parsed.info.owner;
          
          // Get SOL balance
          const solBalance = await connection.getBalance(new PublicKey(address));
          
          // Get USDC balance
          let usdcBalance = 0;
          try {
            const usdcAta = await getAssociatedTokenAddress(usdcMint, new PublicKey(address));
            const usdcAccount = await connection.getTokenAccountBalance(usdcAta);
            usdcBalance = usdcAccount.value.uiAmount || 0;
          } catch (e) {
            console.log('No USDC account for:', address);
          }

          return {
            address,
            tokenBalance: (account.amount / Math.pow(10, 6)) || 0,
            solBalance: (solBalance / Math.pow(10, 9)) || 0,
            usdcBalance: usdcBalance || 0
          };
        })
      );

      // Filter out zero balances and sort by token balance
      const filteredHolders = holders
        .filter(h => h.tokenBalance > 0)
        .sort((a, b) => b.tokenBalance - a.tokenBalance);

      console.log('Setting token holders:', filteredHolders);
      setTokenHolders(filteredHolders);
    } catch (error) {
      console.error('Error fetching token holders:', error);
    } finally {
      console.log('Fetch completed, setting isLoading to false');
      setIsLoading(false);
    }
  };

  // Update route handling
  useEffect(() => {
    const path = location.pathname;
    console.log('Route changed to:', path);
    console.log('Current tokenHolders:', tokenHolders);
    console.log('Current isLoading:', isLoading);
    console.log('Current activeView:', activeView);

    switch (path) {
      case '/':
        setActiveView('ai');
        break;
      case '/shareholders':
        console.log('Setting active view to shareholders');
        setActiveView('shareholders');
        if (tokenHolders.length === 0 && !isLoading) {
          console.log('Fetching token holders for shareholders view');
          fetchTokenHolders();
        }
        break;
      case '/stake':
        setActiveView('stake');
        break;
      case '/wallet':
        setActiveView('wallet');
        break;
      case '/snipe':
        setActiveView('snipe');
        break;
      case '/sign':
        setActiveView('sign');
        break;
      case '/vote':
        setActiveView('vote');
        break;
      default:
        setActiveView('ai');
    }
  }, [location.pathname, tokenHolders.length, isLoading]);

  // Check connection status
  useEffect(() => {
    const checkConnection = async () => {
      const isPhantomConnected = window.phantom?.solana?.isConnected;
      const hasParentWallet = localStorage.getItem('tribify_parent_wallet');
      console.log('Connection check:', { isPhantomConnected, hasParentWallet });
      setIsConnected(isPhantomConnected && hasParentWallet);
      
      if (isPhantomConnected && hasParentWallet) {
        console.log('Connected, fetching token holders...');
        fetchTokenHolders();
      }
    };
    
    checkConnection();
  }, []);

  const handleConnection = async () => {
    try {
      if (!window.phantom?.solana) {
        alert('Please install Phantom wallet!');
        return;
      }

      const resp = await window.phantom.solana.connect();
      localStorage.setItem('tribify_parent_wallet', resp.publicKey.toString());
      setIsConnected(true);
      navigate('/');
    } catch (err) {
      console.error('Failed to connect:', err);
    }
  };

  const handleDisconnect = async () => {
    if (window.phantom?.solana) {
      await window.phantom.solana.disconnect();
    }
    localStorage.removeItem('tribify_parent_wallet');
    setIsConnected(false);
    navigate('/');
  };

  // Show landing page when not connected
  if (!isConnected) {
    return (
      <div className="landing-container">
        <div className="landing-header">
          <div className="logo-section">
            <h1>/tribify.ai</h1>
            <p className="subtitle">AI-powered token management & community platform</p>
          </div>
        </div>

        <div className="landing-content">
          <div className="features-grid">
            <div className="feature-card">
              <h3>Token Management</h3>
              <p>Create and manage up to 100 subwallets for strategic token distribution</p>
            </div>
            <div className="feature-card">
              <h3>Community Tools</h3>
              <p>Monitor token holders, communicate with shareholders, and build your community</p>
            </div>
            <div className="feature-card">
              <h3>Token Conversion</h3>
              <p>Seamlessly convert between TRIBIFY, SOL, and USDC tokens</p>
            </div>
            <div className="feature-card">
              <h3>AI Assistant</h3>
              <p>Get help with wallet management, token strategies, and community engagement</p>
            </div>
          </div>

          <div className="connect-section">
            <button className="connect-button" onClick={handleConnection}>
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show main app when connected
  return (
    <div className="App">
      <nav className="desktop-nav">
        <div className="nav-buttons">
          <button 
            className={`nav-button tribify-button ${activeView === 'ai' ? 'active' : ''}`}
            onClick={() => {
              setActiveView('ai');
              navigate('/');
            }}
          >
            /tribify.ai
          </button>
          <button 
            className={`nav-button ${activeView === 'shareholders' ? 'active' : ''}`}
            onClick={() => {
              console.log('Shareholders button clicked');
              setActiveView('shareholders');
              navigate('/shareholders');
              if (tokenHolders.length === 0 && !isLoading) {
                console.log('Fetching token holders data');
                fetchTokenHolders();
              }
            }}
          >
            Shareholders
          </button>
          <button 
            className={`nav-button wallet-button ${activeView === 'wallet' ? 'active' : ''}`}
            onClick={() => {
              setActiveView('wallet');
              navigate('/wallet');
            }}
          >
            Wallet
          </button>
          <button 
            className={`nav-button stake-button ${activeView === 'stake' ? 'active' : ''}`}
            onClick={() => {
              setActiveView('stake');
              navigate('/stake');
            }}
          >
            Stake
          </button>
          <button 
            className={`nav-button ${activeView === 'snipe' ? 'active' : ''}`}
            onClick={() => {
              setActiveView('snipe');
              navigate('/snipe');
            }}
          >
            Snipe
          </button>
          <button 
            className={`nav-button ${activeView === 'sign' ? 'active' : ''}`}
            onClick={() => {
              setActiveView('sign');
              navigate('/sign');
            }}
          >
            Sign
          </button>
          <button 
            className={`nav-button ${activeView === 'vote' ? 'active' : ''}`}
            onClick={() => {
              setActiveView('vote');
              navigate('/vote');
            }}
          >
            Vote
          </button>
          <button 
            className="nav-button"
            onClick={handleDisconnect}
          >
            Disconnect
          </button>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={
            <div className="landing-container">
              <div className="landing-header">
                <div className="logo-section">
                  <h1>/tribify.ai</h1>
                  <p className="subtitle">AI-powered token management & community platform</p>
                </div>
                
                {localStorage.getItem('tribify_parent_wallet') && (
                  <div className="wallet-info">
                    <div className="wallet-address">
                      <span className="label">Connected:</span>
                      <span className="address">
                        {localStorage.getItem('tribify_parent_wallet')?.slice(0, 4)}...
                        {localStorage.getItem('tribify_parent_wallet')?.slice(-4)}
                      </span>
                    </div>
                    <div className="balance-info">
                      <span className="balance-item tribify">
                        <span className="label">$TRIBIFY:</span>
                        <span className="value">32,071,767.199</span>
                      </span>
                      <span className="balance-item sol">
                        <span className="label">SOL:</span>
                        <span className="value">0.46602528</span>
                      </span>
                      <span className="balance-item usdc">
                        <span className="label">USDC:</span>
                        <span className="value">$0.00</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="landing-content">
                <div className="features-grid">
                  <div className="feature-card">
                    <h3>Token Management</h3>
                    <p>Create and manage up to 100 subwallets for strategic token distribution</p>
                  </div>
                  <div className="feature-card">
                    <h3>Community Tools</h3>
                    <p>Monitor token holders, communicate with shareholders, and build your community</p>
                  </div>
                  <div className="feature-card">
                    <h3>Token Conversion</h3>
                    <p>Seamlessly convert between TRIBIFY, SOL, and USDC tokens</p>
                  </div>
                  <div className="feature-card">
                    <h3>AI Assistant</h3>
                    <p>Get help with wallet management, token strategies, and community engagement</p>
                  </div>
                </div>

                <div className="terminal-section">
                  <div className="terminal-header">
                    <span className="terminal-title">AI Terminal</span>
                    <button className="close-terminal">×</button>
                  </div>
                  <div className="terminal-content">
                    <div className="welcome-message">
                      Welcome to /tribify.ai! I'm your AI assistant for managing TRIBIFY tokens and wallets. I can help you:
                      • Create and manage up to 100 subwallets
                      • Distribute TRIBIFY tokens strategically
                      • Convert between TRIBIFY, SOL, and USDC
                      • Monitor your token holder community
                    </div>
                    <div className="terminal-input-container">
                      <input
                        type="text"
                        className="terminal-input"
                        placeholder="Enter a command or ask for help..."
                      />
                    </div>
                    <div className="terminal-output">
                      Type /help to see all commands
                    </div>
                  </div>
                </div>
              </div>
            </div>
          } />
          <Route path="/shareholders" element={
            <div className="shareholders-container">
              <div className="shareholders-header">
                <h2>Shareholders</h2>
                {localStorage.getItem('tribify_parent_wallet') && (
                  <div className="wallet-info">
                    <div className="wallet-address">
                      <span className="label">Connected:</span>
                      <span className="address">
                        {localStorage.getItem('tribify_parent_wallet')?.slice(0, 4)}...
                        {localStorage.getItem('tribify_parent_wallet')?.slice(-4)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="shareholders-content">
                {isLoading ? (
                  <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <div className="loading-text">Loading shareholders data...</div>
                  </div>
                ) : tokenHolders.length === 0 ? (
                  <div className="error-message">
                    <p>No shareholders data available. Please make sure your wallet is connected.</p>
                    <button 
                      className="retry-button"
                      onClick={() => {
                        console.log('Retrying token holders fetch');
                        fetchTokenHolders();
                      }}
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="holders-list-container">
                    <HoldersList 
                      holders={tokenHolders}
                      nicknames={nicknames}
                      setNicknames={setNicknames}
                      setActiveView={setActiveView}
                      publicKey={localStorage.getItem('tribify_parent_wallet')}
                      subwallets={subwallets}
                    />
                  </div>
                )}
              </div>
            </div>
          } />
          <Route path="/stake" element={
            <div className="stake-container">
              <StakeView 
                parentWallet={{
                  publicKey: localStorage.getItem('tribify_parent_wallet'),
                  tribifyBalance: tokenHolders.find(h => h.address === localStorage.getItem('tribify_parent_wallet'))?.tokenBalance || 0
                }}
                tokenHolders={tokenHolders}
                nicknames={nicknames}
                setNicknames={setNicknames}
              />
            </div>
          } />
          <Route path="/wallet" element={
            <div className="wallet-container">
              <div className="wallet-header">
                <h2>Wallet Management</h2>
                {localStorage.getItem('tribify_parent_wallet') && (
                  <div className="wallet-info">
                    <div className="wallet-address">
                      <span className="label">Connected:</span>
                      <span className="address">
                        {localStorage.getItem('tribify_parent_wallet')?.slice(0, 4)}...
                        {localStorage.getItem('tribify_parent_wallet')?.slice(-4)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="wallet-content">
                <div className="wallet-controls">
                  <div className="left-controls">
                    <button className="wallet-button generate-button">
                      Generate Keys
                    </button>
                    <button className="wallet-button distribute-button">
                      Distribute Tokens
                    </button>
                  </div>
                  <div className="right-controls">
                    <button className="wallet-button fund-button">
                      Fund Wallets
                    </button>
                    <button className="wallet-button sell-all-button">
                      Sell All
                    </button>
                  </div>
                </div>

                <WalletPage 
                  subwallets={subwallets}
                  setSubwallets={setSubwallets}
                />
              </div>
            </div>
          } />
          <Route path="/snipe" element={
            <div className="snipe-container">
              <SnipePage 
                publicKey={localStorage.getItem('tribify_parent_wallet')}
                parentBalance={0.46602528}
                subwallets={subwallets}
              />
            </div>
          } />
          <Route path="/sign" element={
            <div className="sign-container">
              <Sign />
            </div>
          } />
          <Route path="/vote" element={
            <div className="vote-container">
              <VotePage 
                tokenHolders={tokenHolders}
                publicKey={localStorage.getItem('tribify_parent_wallet')}
              />
            </div>
          } />
        </Routes>
      </main>
    </div>
  );
}

export default App; 