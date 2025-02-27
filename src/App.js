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
import { Link, useNavigate, Route, Routes } from 'react-router-dom';
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
        return;
      }

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

      console.log('Fetched holders:', filteredHolders);
      setTokenHolders(filteredHolders);
    } catch (error) {
      console.error('Error fetching token holders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check if wallet is connected
    const checkConnection = async () => {
      const isPhantomConnected = window.phantom?.solana?.isConnected;
      const hasParentWallet = localStorage.getItem('tribify_parent_wallet');
      setIsConnected(isPhantomConnected && hasParentWallet);
      
      // If connected, fetch token holders
      if (isPhantomConnected && hasParentWallet) {
        fetchTokenHolders();
      }
    };
    
    checkConnection();
  }, []);

  const handleConnection = async () => {
    navigate('/');
  };

  const handleDisconnect = async () => {
    if (window.phantom?.solana) {
      await window.phantom.solana.disconnect();
    }
    localStorage.removeItem('tribify_parent_wallet');
    navigate('/');
  };

  // Show main app when connected
  return (
    <div className="App">
      {!isConnected ? (
        <div className="connection-group">
          <div className="tribify-text">/tribify.ai</div>
          <button onClick={handleConnection}>Connect</button>
        </div>
      ) : (
        <>
          <nav className="desktop-nav">
            <div className="nav-buttons">
              <button 
                className={`nav-button tribify-button ${activeView === 'ai' ? 'active' : ''}`}
                onClick={() => setActiveView('ai')}
              >
                /tribify.ai
              </button>
              <button 
                className={`nav-button ${activeView === 'shareholders' ? 'active' : ''}`}
                onClick={() => setActiveView('shareholders')}
              >
                Shareholders
              </button>
              <button 
                className={`nav-button wallet-button ${activeView === 'wallet' ? 'active' : ''}`}
                onClick={() => setActiveView('wallet')}
              >
                Wallet
              </button>
              <button 
                className={`nav-button stake-button ${activeView === 'stake' ? 'active' : ''}`}
                onClick={() => setActiveView('stake')}
              >
                Stake
              </button>
              <button 
                className={`nav-button ${activeView === 'snipe' ? 'active' : ''}`}
                onClick={() => setActiveView('snipe')}
              >
                Snipe
              </button>
              <button 
                className={`nav-button ${activeView === 'sign' ? 'active' : ''}`}
                onClick={() => setActiveView('sign')}
              >
                Sign
              </button>
              <button 
                className={`nav-button ${activeView === 'vote' ? 'active' : ''}`}
                onClick={() => setActiveView('vote')}
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
            {activeView === 'ai' && (
              <div className="terminal-container">
                <div className="terminal-header">
                  <div className="wallet-info">
                    <span className="wallet-address">
                      {localStorage.getItem('tribify_parent_wallet')?.slice(0, 4)}...
                      {localStorage.getItem('tribify_parent_wallet')?.slice(-4)}
                    </span>
                    <div className="balance-info">
                      <span className="balance-item tribify">32,071,767.199 $TRIBIFY</span>
                      <span className="balance-item sol">0.46602528 SOL</span>
                      <span className="balance-item usdc">$0 USDC</span>
                    </div>
                  </div>
                  <button className="close-terminal">×</button>
                </div>

                <div className="welcome-message">
                  Welcome to /tribify.ai! I'm your AI assistant for managing TRIBIFY tokens and wallets. I can help you:
                  • Create and manage up to 100 subwallets
                  • Distribute TRIBIFY tokens strategically
                  • Convert between TRIBIFY, SOL, and USDC
                  • Monitor your token holder community
                </div>

                <input
                  type="text"
                  className="terminal-input"
                  placeholder="Enter a command or ask for help..."
                />

                <div className="terminal-output">
                  Type /help to see all commands
                </div>
              </div>
            )}

            {activeView === 'shareholders' && (
              <div className="shareholders-container">
                {isLoading ? (
                  <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                  </div>
                ) : (
                  <Shareholders 
                    holders={tokenHolders}
                    nicknames={nicknames}
                    setNicknames={setNicknames}
                    setActiveView={setActiveView}
                    publicKey={localStorage.getItem('tribify_parent_wallet')}
                  />
                )}
              </div>
            )}

            {activeView === 'wallet' && (
              <div className="wallet-container">
                <WalletPage 
                  subwallets={subwallets}
                  setSubwallets={setSubwallets}
                />
              </div>
            )}

            {activeView === 'stake' && (
              <div className="stake-container">
                <StakeView 
                  parentWallet={{
                    publicKey: localStorage.getItem('tribify_parent_wallet'),
                    tribifyBalance: tokenHolders.find(h => h.address === localStorage.getItem('tribify_parent_wallet'))?.tokenBalance || 0
                  }}
                  tokenHolders={tokenHolders}
                />
              </div>
            )}

            {activeView === 'snipe' && (
              <div className="snipe-container">
                <SnipePage 
                  publicKey={localStorage.getItem('tribify_parent_wallet')}
                  parentBalance={0.46602528}
                  subwallets={subwallets}
                />
              </div>
            )}

            {activeView === 'sign' && (
              <div className="sign-container">
                <Sign />
              </div>
            )}

            {activeView === 'vote' && (
              <div className="vote-container">
                <VotePage 
                  tokenHolders={tokenHolders}
                  publicKey={localStorage.getItem('tribify_parent_wallet')}
                />
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}

export default App; 