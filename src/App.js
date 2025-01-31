import React, { useState, useEffect } from 'react';
import './App.css';
import { Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

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

function App() {
  // Core states only
  const [status, setStatus] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [balance, setBalance] = useState(null);
  const [tokenHolders, setTokenHolders] = useState([]);
  const [isDark, setIsDark] = useState(true);  // Keep dark mode
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

      // Treasury path
      if (userPublicKey === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv') {
        setIsConnected(true);
        setPublicKey(userPublicKey);
        setStatus('Treasury wallet connected!');
        await updateBalance(userPublicKey);
        fetchTokenHolders();
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

  // Connect to WebSocket when user connects wallet
  useEffect(() => {
    if (isConnected && publicKey) {
      const ws = new WebSocket('wss://your-websocket-server.com');
      
      ws.onopen = () => {
        console.log('WebSocket Connected');
        // Register user
        ws.send(JSON.stringify({
          type: 'register',
          publicKey
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          // Add new message to state
          setMessages(prev => ({
            ...prev,
            [data.from]: [...(prev[data.from] || []), {
              from: data.from,
              text: data.text,
              timestamp: data.timestamp
            }]
          }));
          // Increment unread count
          if (data.from !== publicKey && (!activeChat || activeChat !== data.from)) {
            setUnreadCounts(prev => ({
              ...prev,
              [data.from]: (prev[data.from] || 0) + 1
            }));
          }
        }
      };

      setSocket(ws);
      return () => ws.close();
    }
  }, [isConnected, publicKey]);

  // Update send message to use WebSocket
  const handleSendMessage = async (e, recipient) => {
    e.preventDefault();
    if (!messageInput.trim() || !socket) return;

    const message = {
      type: 'message',
      from: publicKey,
      to: recipient,
      text: messageInput,
      timestamp: Date.now()
    };

    socket.send(JSON.stringify(message));
    setMessageInput('');
  };

  // Add disconnect handler
  const handleDisconnect = async () => {
    try {
      await window.phantom.solana.disconnect();
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
      message: (
        <>
          <h3>Save Nickname</h3>
          <p>Would you like to save "{nickname}" as a nickname for this address?</p>
          <p className="dialog-note">This will be stored locally on your computer. You can backup your nicknames anytime.</p>
        </>
      ),
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

  return (
    <div className={`App ${isDark ? 'dark' : 'light'}`}>
      <button className="mode-toggle" onClick={() => setIsDark(!isDark)}>
        {isDark ? '◯' : '●'}
      </button>

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
            <button className="disconnect-button" onClick={handleDisconnect}>
              Disconnect
            </button>
          </>
        )}
      </div>

      {isConnected && (
        <>
          <div className="wallet-info">
            <div>◈ {publicKey}</div>
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
              <h3>TRIBIFY Holders</h3>
              {tokenHolders.map((holder, i) => (
                <div key={i} className="holder-item">
                  <div className="address-container">
                    <div>◈ {holder.address}</div>
                    <div className="actions">
                      {editingNickname === holder.address ? (
                        <form 
                          className="nickname-form"
                          onSubmit={(e) => handleNicknameSubmit(e, holder.address)}
                        >
                          <input 
                            name="nickname"
                            defaultValue={nicknames[holder.address] || ''}
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
                            {nicknames[holder.address] || '+ Add nickname'}
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
                    <div>◇ {(holder.tokenBalance || 0).toLocaleString()} $TRIBIFY</div>
                    <div>◇ {(holder.solBalance || 0).toLocaleString()} SOL</div>
                    <div>◇ ${(holder.usdcBalance || 0).toLocaleString()} USDC</div>
                  </div>
                </div>
              ))}
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
                    <div key={i} className={`message ${msg.from === publicKey ? 'sent' : 'received'}`}>
                      {msg.text}
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
                Save
              </button>
              <button onClick={() => {
                setDialogConfig({ show: false });
                setEditingNickname(null);
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 