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
import { Routes, Route, Navigate, useLocation, Router } from 'react-router-dom';
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
import SniperPage from './components/SniperPage';
import RoutingView from './components/RoutingView';
import AiView from './components/AiView';
import Docs from './components/Docs';
import LandingPage from './components/LandingPage';
import AppLayout from './components/AppLayout';
import MainDashboard from './components/MainDashboard';
import LayoutPage from './components/LayoutPage/LayoutPage';

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

function MainContent({ activeView, setActiveView }) {
  // Your existing view switching logic
  return (
    <>
      {activeView === 'tribify.ai' && <AiView />}
      {activeView === 'shareholders' && <Shareholders />}
      {activeView === 'stake' && <StakeView />}
      {/* ... other view conditions ... */}
    </>
  );
}

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = window.phantom?.solana?.isConnected && 
                         localStorage.getItem('tribify_parent_wallet');

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  
  return children;
};

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/routing" element={<RoutingView />} />

      {/* Protected app routes */}
      <Route path="/app/*" element={
        <ProtectedRoute>
          <AppLayout>
            <Routes>
              <Route path="tribify" element={<MainDashboard />} />
              <Route path="ai" element={<AiView />} />
              <Route path="stake" element={<StakeView />} />
              <Route path="holders" element={<Shareholders />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="sniper" element={<SniperPage />} />
              <Route path="wallet" element={<WalletPage />} />
              <Route path="sign" element={<Sign />} />
              <Route path="vote" element={<VotePage />} />
              <Route path="docs" element={<Docs />} />
              <Route path="graph" element={<TokenHolderGraph />} />
              <Route path="layout" element={<LayoutPage />} />
              
              {/* Settings routes */}
              <Route path="settings/*" element={
                <Routes>
                  <Route path="password" element={<Password />} />
                  <Route path="backup" element={<Backup />} />
                  <Route path="restore" element={<Restore />} />
                  <Route index element={<Navigate to="password" replace />} />
                </Routes>
              } />

              {/* Default redirect */}
              <Route index element={<Navigate to="ai" replace />} />
              <Route path="*" element={<Navigate to="ai" replace />} />
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      } />

      {/* Catch all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App; 