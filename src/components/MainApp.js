import React, { useState, useEffect, useRef, useCallback, useContext, lazy, Suspense } from 'react';
import { Link, useNavigate, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3-force';
import Pusher from 'pusher-js';
import { encrypt, decrypt } from '../lib/encryption';
import Connected from './Connected';
import Password from './Password';
import Messages from './Messages';
import Backup from './Backup';
import Restore from './Restore';
import Disconnect from './Disconnect';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { clusterApiUrl } from '@solana/web3.js';
import HamburgerMenu from './HamburgerMenu';
import TokenHolderGraph from './TokenHolderGraph';
import MessagesPage from './MessagesPage';
import StakeView from './StakeView';
import WalletPage from './WalletPage';
import Shareholders from './Shareholders';
import { TribifyContext } from '../context/TribifyContext';
import Sign from './Sign';
import VotePage from './VotePage';
import SnipePage from './SnipePage';
import { 
  FaWallet, FaChartLine, FaUsers, FaExchangeAlt, FaLock, 
  FaCog, FaHome, FaRobot, FaSignature, FaVoteYea, 
  FaSearchDollar, FaBars, FaEnvelope, FaDownload, 
  FaUpload, FaBook, FaNetworkWired, FaSignOutAlt,
  FaMoon, FaSun, FaTimes, FaRegPaperPlane, FaChartPie, FaCoins, FaUser
} from 'react-icons/fa';
import MessageModal from './MessageModal';
import ThemeToggle from './ThemeToggle';
import useAutoScroll from '../hooks/useAutoScroll';
import './MainApp.css';

// Need this for Solana
window.Buffer = window.Buffer || require('buffer').Buffer;

// Constants
const TRIBIFY_TOKEN_MINT = "672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump";
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
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

function MainApp() {
  const location = useLocation();
  const { pathname } = location;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [wallets, setWallets] = useState([]);
  const [publicKey, setPublicKey] = useState(null);
  const [tokenHolders, setTokenHolders] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isAuth, setIsAuth] = useState(false);
  const [activeView, setActiveView] = useState('ai');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [ioConnected, setIOConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const [authAttempts, setAuthAttempts] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [message, setMessage] = useState('');
  const [openAIResponse, setOpenAIResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingWalletData, setLoadingWalletData] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('themeMode') || 'dark');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

  // Auto-scroll hook for terminal messages
  const messagesScrollRef = useAutoScroll([chatMessages]);

  // Theme toggle function
  const toggleTheme = () => {
    const newTheme = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(newTheme);
    localStorage.setItem('themeMode', newTheme);
    document.body.classList.toggle('dark-theme', newTheme === 'dark');
    document.body.classList.toggle('light-theme', newTheme === 'light');
  };

  // Notification helper
  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 3000);
  };

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      console.log("User not connected, redirecting to landing page...");
      navigate('/', { state: { from: location } });
    } else {
      console.log("User connected with wallet:", publicKey);
    }
  }, [isConnected, navigate, location, publicKey]);

  // Apply theme class to body
  useEffect(() => {
    document.body.className = themeMode;
  }, [themeMode]);

  // Auto-close mobile menu when view changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeView]);

  // All your existing function definitions

  const handleSubwalletsUpdate = (newWallets) => {
    // Implementation needed
  };

  const updateBalance = async (pubKey) => {
    // Implementation needed
  };

  const fetchTokenHolders = async () => {
    // Implementation needed
  };

  const backupNicknames = () => {
    // Implementation needed
  };

  const handleDisconnect = async () => {
    showNotification("Disconnecting wallet...", "info");
    // Implementation needed
      navigate('/');
  };

  const handleTribifyPrompt = async (e) => {
    e.preventDefault();
    const input = message.trim();
    if (!input) return;
    
    // Start loading state
    setLoading(true);
    
    // Add user input to responses with timestamp
    const userMessage = {
      type: 'input',
      text: input,
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    
    // Process the command
    let response = '';
    const lowerInput = input.toLowerCase();
    
    // Simple command handling
    if (lowerInput.includes('/help')) {
      response = `Available commands:
• /help - Show this help message
• /wallets - Manage your wallets
• /holders - View token holders
• /balance - Check your balance
• /send [address] [amount] - Send TRIBIFY tokens
• /graph - View token holder graph
• /stake - Stake your tokens
• /clear - Clear the chat history`;
    } 
    else if (lowerInput.includes('/wallets')) {
      setActiveView('wallet');
      response = 'Switching to wallet management view...';
    }
    else if (lowerInput.includes('/holders')) {
      setActiveView('holders');
      response = 'Switching to token holders view...';
    }
    else if (lowerInput.includes('/graph')) {
      setActiveView('graph');
      response = 'Switching to token holder graph view...';
    }
    else if (lowerInput.includes('/stake')) {
      setActiveView('stake');
      response = 'Switching to staking view...';
    } 
    else if (lowerInput.includes('/clear')) {
      setChatMessages([]);
      response = 'Chat history cleared.';
    }
    else if (lowerInput.includes('/balance')) {
      response = `Your current balances:
• TRIBIFY: ${wallet ? parseFloat(wallet.tribe).toLocaleString() : '0'} TRIBE
• SOL: ${wallet ? parseFloat(wallet.sol).toLocaleString() : '0'} SOL
• USDC: $${wallet ? parseFloat(wallet.usdc).toLocaleString() : '0'}`;
    }
    else if (lowerInput.startsWith('/send')) {
      response = "The send feature is coming soon! You'll be able to send tokens to other wallet addresses.";
    }
    else if (lowerInput.includes('what are tribify tokens') || lowerInput.includes('about tribify')) {
      response = `TRIBIFY tokens are the native cryptocurrency of the TRIBIFY ecosystem. They allow you to:

• Participate in governance voting
• Stake to earn rewards
• Send payments to other users
• Access premium features
• Trade on exchanges

The total supply is capped, making TRIBIFY a deflationary asset with potential for value appreciation as the ecosystem grows.`;
    }
    else if (lowerInput.includes('manage my wallet') || lowerInput.includes('wallet management')) {
      response = `To manage your wallets, you can:

1. Use the Wallet tab to view all your connected wallets
2. Create sub-wallets for different purposes
3. View transaction history and token balances
4. Send and receive TRIBIFY tokens
5. Import existing wallets using private keys
6. Export wallet details for backup purposes

Would you like me to explain any of these features in more detail?`;
    }
    else {
      // Generic responses for regular questions
      const genericResponses = [
        "I'm still learning about that. Can you try asking in a different way?",
        "That's an interesting question! Let me think about it...",
        "I don't have enough information to answer that specific question yet.",
        "I'm designed to help with TRIBIFY token operations. Try asking about wallets, holders, or token features.",
        "Let me help you with TRIBIFY-related tasks. Try using commands like /help, /wallets, or /holders."
      ];
      
      response = genericResponses[Math.floor(Math.random() * genericResponses.length)];
    }
    
    // Add AI response after a small delay to simulate thinking
    setTimeout(() => {
      // Add AI response with timestamp
      const aiMessage = {
        type: 'response',
        text: response,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
      setLoading(false);
    }, 1000);
    
    // Clear the input
    setMessage('');
  };

  const handleSendMessage = async () => {
    // Implementation needed
  };

  const handleCloseChat = () => {
    // Implementation needed
  };

  const handleInboxClick = (address) => {
    // Implementation needed
  };

  const getTotalUnread = () => {
    return Object.values(unreadMessages).reduce((a, b) => a + b, 0);
  };

  // Main navigation items
  const mainNavItems = [
    { id: 'ai', icon: <FaRegPaperPlane />, label: 'AI Terminal', onClick: () => setActiveView('ai') },
    { id: 'holders', icon: <FaUsers />, label: 'Shareholders', onClick: () => setActiveView('holders') },
    { id: 'graph', icon: <FaChartPie />, label: 'Graph', onClick: () => setActiveView('graph') },
    { id: 'messages', icon: <FaEnvelope />, label: 'Messages', onClick: () => setActiveView('messages') },
    { id: 'wallet', icon: <FaWallet />, label: 'Wallet', onClick: () => setActiveView('wallet') },
    { id: 'stake', icon: <FaCoins />, label: 'Stake', onClick: () => setActiveView('stake') }
  ];

  // Utility navigation items
  const utilityNavItems = [
    { id: 'settings', icon: <FaCog />, label: 'Settings', onClick: () => setActiveView('settings') },
    { id: 'logout', icon: <FaSignOutAlt />, label: 'Disconnect', onClick: handleDisconnect }
  ];

  // Main render
  if (isLoading) {
    return (
      <div className="app-container">
      <div className="loading-container">
        <div className="loading-spinner"></div>
          <p>Loading Tribify...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-container ${themeMode}-theme`}>
      {notification.show && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      <div className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
        {mobileMenuOpen ? <FaTimes /> : <FaBars />}
      </div>

      <div className={`app-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <h2>TRIBIFY</h2>
          </div>
          <ThemeToggle currentTheme={themeMode} toggleTheme={toggleTheme} />
        </div>
        
        <div className="sidebar-user">
          <div className="user-avatar">
            <FaUser />
          </div>
          <div className="user-info">
            <p className="user-name">
              {publicKey ? `${publicKey.toString().substring(0, 4)}...${publicKey.toString().substring(publicKey.toString().length - 4)}` : 'Not Connected'}
            </p>
            <p className="user-status">{isConnected ? 'Connected' : 'Disconnected'}</p>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <div className="nav-section">
            <h3 className="nav-section-title">Main</h3>
            <ul className="nav-items">
              {mainNavItems.map(item => (
                <li key={item.id} className={`nav-item ${activeView === item.id ? 'active' : ''}`} onClick={item.onClick}>
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {item.id === 'messages' && getTotalUnread() > 0 && (
                    <span className="nav-badge">{getTotalUnread()}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="nav-section">
            <h3 className="nav-section-title">Settings</h3>
            <ul className="nav-items">
              {utilityNavItems.map(item => (
                <li key={item.id} className={`nav-item ${activeView === item.id ? 'active' : ''}`} onClick={item.onClick}>
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </nav>
        
        <div className="sidebar-footer">
          <div className="connection-status">
            <span className={`status-indicator ${ioConnected ? 'connected' : 'disconnected'}`}></span>
            <span className="status-text">{ioConnected ? 'Online' : 'Offline'}</span>
          </div>
          {!ioConnected && (
            <button className="reconnect-button" onClick={() => {
              // Implementation needed
            }}>Reconnect</button>
          )}
        </div>
      </div>

      <div className="main-content">
        <div className="user-info-card">
          <div className="user-info-header">
            <h3 className="user-info-title">Wallet Information</h3>
          </div>
          <div className="user-info-content">
            <div className="user-info-item">
              <div className="user-info-label">Wallet Address</div>
              <div className="user-info-value address">
                {publicKey ? publicKey.toString() : 'Not Connected'}
                {publicKey && (
                  <span className="copy-icon" onClick={() => {
                    navigator.clipboard.writeText(publicKey.toString());
                    showNotification('Address copied to clipboard', 'success');
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </span>
                )}
              </div>
            </div>
            {wallet && (
              <>
                <div className="user-info-item">
                  <div className="user-info-label">TRIBE Balance</div>
                  <div className="user-info-value balance">
                    {wallet.tribe ? parseFloat(wallet.tribe).toLocaleString() : '0'} TRIBE
                  </div>
                </div>
                <div className="user-info-item">
                  <div className="user-info-label">SOL Balance</div>
                  <div className="user-info-value balance">
                    {wallet.sol ? parseFloat(wallet.sol).toLocaleString() : '0'} SOL
                  </div>
            </div>
              </>
            )}
          </div>
        </div>
        
        <div className="view-navigation">
          {mainNavItems.map(item => (
            <button 
              key={item.id}
              className={`view-nav-item ${activeView === item.id ? 'active' : ''}`}
              onClick={item.onClick}
            >
              {item.icon} {item.label}
              {item.id === 'messages' && getTotalUnread() > 0 && (
                <span className="nav-badge">{getTotalUnread()}</span>
              )}
            </button>
          ))}
        </div>
        
        <div className="view-container">
          {loadingWalletData ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading wallet data...</p>
            </div>
          ) : (
            <>
        {activeView === 'holders' && (
                <div className="token-holders-container">
                  <div className="token-holders-header">
                    <h2 className="token-holders-title">TRIBE Token Holders</h2>
                    <div className="token-holders-actions">
                      <button className="refresh-button" onClick={fetchTokenHolders}>Refresh</button>
                    </div>
                  </div>
                  <Shareholders tokenHolders={tokenHolders} publicKey={publicKey} nicknames={[]} />
          </div>
        )}

        {activeView === 'graph' && (
          <div className="graph-container">
                  <div className="graph-header">
                    <h2 className="graph-title">Token Distribution</h2>
                    <div className="graph-controls">
                      <button className="active">Pie Chart</button>
                      <button>Bar Chart</button>
                    </div>
                  </div>
                  <div className="graph-content">
                    <TokenHolderGraph tokenHolders={tokenHolders} />
                  </div>
          </div>
        )}

        {activeView === 'messages' && (
                <div className="messages-container">
          <MessagesPage 
            publicKey={publicKey}
            messages={messages}
                    unreadMessages={unreadMessages}
                    setUnreadMessages={setUnreadMessages}
            onSendMessage={handleSendMessage}
                    onCloseChat={handleCloseChat}
                    onInboxClick={handleInboxClick}
          />
                </div>
        )}

        {activeView === 'stake' && (
                <div className="stake-container">
                  <div className="stake-header">
                    <h2 className="stake-title">Stake Your TRIBE</h2>
                  </div>
                  <div className="stake-content">
                    <StakeView publicKey={publicKey} wallet={wallet} />
                  </div>
                </div>
              )}
              
              {activeView === 'ai' && (
                <div className="ai-container fade-in">
                  <div className="ai-terminal">
                    <div className="terminal-header">
                      <h2 className="terminal-title">TRIBIFY AI Terminal</h2>
                      <div className="terminal-actions">
                        <button className="terminal-action-btn" onClick={() => {
                          setChatMessages([]);
                          showNotification("Chat history cleared", "info");
                        }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="terminal-content">
                      <div className="terminal-messages" ref={messagesScrollRef} id="messages-container">
                        {chatMessages.length === 0 && (
                          <div className="welcome-message">
                            <div className="welcome-header">
                              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="url(#paint0_linear)" strokeWidth="2"/>
                                <path d="M8 12L11 15L16 9" stroke="url(#paint1_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <defs>
                                  <linearGradient id="paint0_linear" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#FC466B"/>
                                    <stop offset="1" stopColor="#3F5EFB"/>
                                  </linearGradient>
                                  <linearGradient id="paint1_linear" x1="8" y1="9" x2="16" y2="15" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#FC466B"/>
                                    <stop offset="1" stopColor="#3F5EFB"/>
                                  </linearGradient>
                                </defs>
                              </svg>
                              <h3>Welcome to TRIBIFY AI</h3>
                            </div>
                            <p>I'm your AI assistant for managing TRIBIFY tokens and wallets. Here are some things you can ask me:</p>
                            <div className="suggestion-chips">
                              <button onClick={() => {
                                setMessage("/help");
                                handleTribifyPrompt({ preventDefault: () => {} });
                              }}>Show all commands</button>
                              <button onClick={() => {
                                setMessage("How do I manage my wallets?");
                                handleTribifyPrompt({ preventDefault: () => {} });
                              }}>Wallet management</button>
                              <button onClick={() => {
                                setMessage("What are TRIBIFY tokens?");
                                handleTribifyPrompt({ preventDefault: () => {} });
                              }}>About TRIBIFY</button>
                              <button onClick={() => {
                                setMessage("/balance");
                                handleTribifyPrompt({ preventDefault: () => {} });
                              }}>Check balance</button>
                            </div>
                          </div>
                        )}
                        
                        {chatMessages.map((msg, index) => (
                          <div key={index} className={`terminal-message ${msg.type === 'input' ? 'user' : 'ai'}`}>
                            <div className="message-content">
                              {msg.type === 'input' && <span className="message-prefix">&gt; </span>}
                              {msg.text}
                            </div>
                            <div className="message-time">
                              {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
                            </div>
                          </div>
                        ))}
                        
                        {loading && (
                          <div className="ai-typing">
                            <span className="dot"></span>
                            <span className="dot"></span>
                            <span className="dot"></span>
                          </div>
                        )}
                      </div>
                      
                      <form className="terminal-input" onSubmit={handleTribifyPrompt}>
                        <input
                          type="text"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Type a command or ask a question..."
                          disabled={loading}
                        />
                        <button 
                          type="submit"
                          disabled={!message.trim() || loading} 
                          className="send-button"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                          </svg>
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
              
              {activeView === 'wallet' && (
                <WalletPage publicKey={publicKey} wallet={wallet} />
        )}

        {activeView === 'snipe' && (
                <SnipePage publicKey={publicKey} />
        )}

        {activeView === 'sign' && (
            <Sign />
        )}

        {activeView === 'vote' && (
                <VotePage publicKey={publicKey} tokenHolders={tokenHolders} />
              )}
              
              {activeView === 'settings' && (
                <div className="settings-container">
                  <div className="settings-header">
                    <h2 className="settings-title">Settings</h2>
          </div>
                  <div className="settings-content">
                    <div className="settings-section">
                      <h3 className="section-title">Theme</h3>
                      <div className="theme-options">
                        <button 
                          className={`theme-option ${themeMode === 'light' ? 'active' : ''}`} 
                          onClick={() => {
                            setThemeMode('light');
                            localStorage.setItem('themeMode', 'light');
                            document.body.classList.remove('dark-theme');
                            document.body.classList.add('light-theme');
                          }}
                        >
                          <FaSun /> Light
                        </button>
                        <button 
                          className={`theme-option ${themeMode === 'dark' ? 'active' : ''}`} 
                          onClick={() => {
                            setThemeMode('dark');
                            localStorage.setItem('themeMode', 'dark');
                            document.body.classList.remove('light-theme');
                            document.body.classList.add('dark-theme');
                          }}
                        >
                          <FaMoon /> Dark
                        </button>
              </div>
                    </div>
                    <div className="settings-section">
                      <h3 className="section-title">Connection</h3>
                      <div className="connection-options">
                        <div className="connection-status">
                          <span className={`status-indicator ${ioConnected ? 'connected' : 'disconnected'}`}></span>
                          <span>Socket: {ioConnected ? 'Connected' : 'Disconnected'}</span>
                        </div>
                        <div className="connection-status">
                          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
                          <span>Wallet: {isConnected ? 'Connected' : 'Disconnected'}</span>
                        </div>
                        <button className="refresh-button" onClick={fetchTokenHolders}>Refresh Data</button>
                      </div>
                    </div>
          </div>
        </div>
      )}
            </>
          )}
          </div>
        </div>
      
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <Password 
              setIsAuth={setIsAuth} 
              authAttempts={authAttempts}
              setAuthAttempts={setAuthAttempts}
              onClose={() => setShowPasswordModal(false)} 
            />
          </div>
        </div>
      )}

      <MessageModal 
        messages={messages}
        publicKey={publicKey}
        unreadMessages={unreadMessages}
        setUnreadMessages={setUnreadMessages}
        onSendMessage={handleSendMessage}
        onCloseChat={handleCloseChat}
        onInboxClick={handleInboxClick}
      />

      <Routes>
        <Route path="/wallet" element={<WalletPage />} />
      </Routes>
    </div>
  );
}

export default MainApp; 