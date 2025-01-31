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
      const hasTokenAccount = await checkTokenAccount(userPublicKey);

      // Treasury path - no payment needed
      if (userPublicKey === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv') {
        setIsConnected(true);
        setPublicKey(userPublicKey);
        setStatus('Treasury wallet connected!');
        await updateBalance(userPublicKey);
        fetchTokenHolders();
        return;
      }

      // Regular user path - single payment
      setIsConnected(true);
      setPublicKey(userPublicKey);
      
      if (hasTokenAccount) {
        setStatus('Welcome back!');
        await updateBalance(userPublicKey);
        return;
      }

      // New user - needs to pay and get tokens
      setStatus('Please approve payment (0.001 SOL) to receive 100 $TRIBIFY...');
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

      // Payment successful
      setHasPaid(true);
      setStatus('Payment received! Getting your tokens...');

      // Send tokens
      try {
        const response = await fetch('/api/send-tribify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: userPublicKey,
            amount: TRIBIFY_REWARD_AMOUNT
          })
        });
        setStatus('Tokens sent! Check your wallet.');
        fetchTokenHolders();
      } catch (error) {
        setStatus('Payment received! Treasury is processing your tokens. Click refresh to check status.');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setStatus('Error: ' + error.message);
    }
  };

  const fetchTokenHolders = async () => {
    try {
      const mintPubkey = new PublicKey(TRIBIFY_TOKEN_MINT);
      const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC mint
      const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey);
      
      const holders = await Promise.all(
        largestAccounts.value.map(async (account) => {
          const accountInfo = await connection.getParsedAccountInfo(account.address);
          const address = accountInfo.value.data.parsed.info.owner;
          
          // Get SOL balance
          const solBalance = await connection.getBalance(new PublicKey(address));
          
          // Try to get USDC balance
          let usdcBalance = 0;
          try {
            const usdcAta = await getAssociatedTokenAddress(usdcMint, new PublicKey(address));
            const usdcAccount = await connection.getTokenAccountBalance(usdcAta);
            usdcBalance = usdcAccount.value.uiAmount || 0;
          } catch {
            // No USDC account, leave as 0
          }

          return {
            address,
            tokenBalance: (account.amount / Math.pow(10, 6)) || 0,
            solBalance: (solBalance / LAMPORTS_PER_SOL) || 0,
            usdcBalance: usdcBalance || 0
          };
        })
      );

      setTokenHolders(holders.filter(h => h.tokenBalance > 0));
    } catch (error) {
      console.error('Failed to fetch holders:', error);
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

  // Add message handling function
  const handleSendMessage = async (e, recipient) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    console.log('Sending message:', {
      from: publicKey,
      to: recipient,
      text: messageInput
    });

    const newMessage = {
      from: publicKey,
      to: recipient,
      text: messageInput,
      timestamp: Date.now()
    };

    // Add to messages with better initialization
    setMessages(prev => {
      const recipientMessages = prev[recipient] || [];
      console.log('Previous messages:', recipientMessages);
      
      const updated = {
        ...prev,
        [recipient]: [...recipientMessages, newMessage]
      };
      
      console.log('Updated messages:', updated);
      return updated;
    });

    // Clear input
    setMessageInput('');

    // Increment unread count for recipient
    setUnreadCounts(prev => ({
      ...prev,
      [recipient]: (prev[recipient] || 0) + 1
    }));
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
            {publicKey === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv' ? (
              // Treasury refresh button
              <button 
                className="refresh-button"
                onClick={() => {
                  fetchTreasuryBalances();
                  fetchTokenHolders();
                  setStatus('Treasury balances updated');
                }}
              >
                Refresh
              </button>
            ) : (
              // Regular user refresh button
              hasPaid && (
                <button 
                  className="refresh-button"
                  onClick={async () => {
                    try {
                      const hasTokens = await checkTokenAccount(publicKey);
                      if (hasTokens) {
                        setStatus('Tokens received! Check your wallet.');
                        fetchTokenHolders();
                      } else {
                        setStatus('Treasury is still processing your tokens. Click refresh to check again.');
                      }
                    } catch (error) {
                      setStatus('Still processing your tokens. Click refresh to check again.');
                    }
                  }}
                >
                  Refresh
                </button>
              )
            )}
            <button 
              className="messages-button"
              onClick={() => setShowAllMessages(true)}
            >
              Messages {getTotalUnread() > 0 ? `(${getTotalUnread()})` : ''}
            </button>
            <button onClick={backupNicknames}>Backup Names</button>
            <label className="restore-button">
              Restore Names
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
            {publicKey === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv' ? (
              <>
                <div>◈ {publicKey}</div>
                <div>◇ {balance} SOL</div>
                <div>◇ {treasuryBalances.tribify.toLocaleString()} $TRIBIFY</div>
                <div>◇ ${treasuryBalances.usdc.toLocaleString()} USDC</div>
              </>
            ) : (
              <>
                <div>◈ {publicKey}</div>
                <div>◇ {balance} SOL</div>
              </>
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