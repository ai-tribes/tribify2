import React, { useState, useEffect, useContext } from 'react';
import './Shareholders.css';
import { TribifyContext } from '../context/TribifyContext';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

// Constants
const TRIBIFY_TOKEN_MINT = "672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump";
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const MINIMUM_BALANCE_THRESHOLD = 0.1 * 1_000_000; // 0.1 TRIBIFY (assuming 6 decimals)

const Shareholders = ({ 
  holders = [],
  nicknames = {},
  setNicknames,
  setActiveView,
  publicKey,
  subwallets = []
}) => {
  const { publicKeys, userWallets = [], setPublicKeys, setSubwallets } = useContext(TribifyContext);
  const [editingNickname, setEditingNickname] = useState(null);
  const [editingPublicName, setEditingPublicName] = useState(null);
  const [publicNames, setPublicNames] = useState(() => {
    const saved = localStorage.getItem('publicNames');
    return saved ? JSON.parse(saved) : {};
  });
  const [notification, setNotification] = useState(null);
  const [tokenHolders, setTokenHolders] = useState(holders || []);
  const [isLoading, setIsLoading] = useState(false);

  // Save public names whenever they change
  useEffect(() => {
    localStorage.setItem('publicNames', JSON.stringify(publicNames));
  }, [publicNames]);

  // Load subwallets from local storage on component mount
  useEffect(() => {
    const loadSubwalletsFromStorage = () => {
      try {
        // Check if we already have subwallets loaded
        if (publicKeys && publicKeys.length > 0) {
          return;
        }

        // Load encrypted keypairs from localStorage
        const encryptedData = localStorage.getItem('tribify_keypairs');
        if (!encryptedData) {
          return;
        }

        // Get parent wallet address for decryption
        const parentWallet = localStorage.getItem('tribify_parent_wallet');
        if (!parentWallet) {
          return;
        }

        // Decrypt the data
        const CryptoJS = require('crypto-js');
        const decrypted = CryptoJS.AES.decrypt(encryptedData, parentWallet).toString(CryptoJS.enc.Utf8);
        
        if (!decrypted) {
          return;
        }

        const storedData = JSON.parse(decrypted);
        
        // Extract public keys from the stored data
        const loadedPublicKeys = storedData.map(pair => pair.publicKey);
        
        // Update context with loaded public keys
        setPublicKeys(loadedPublicKeys);
        setSubwallets(loadedPublicKeys.map(pk => ({ publicKey: pk })));
      } catch (error) {
        console.error('Failed to load subwallets from localStorage:', error);
      }
    };

    loadSubwalletsFromStorage();
  }, [setPublicKeys, setSubwallets, publicKeys]);

  // Scan TRIBIFY contract for token holders
  useEffect(() => {
    const scanTokenHolders = async () => {
      // Skip if we already have holders data
      if (holders && holders.length > 0) {
        setTokenHolders(holders);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Connect to Solana
        const connection = new Connection(
          process.env.REACT_APP_RPC_URL || 'https://api.mainnet-beta.solana.com',
          'confirmed'
        );
        
        const mintPubkey = new PublicKey(TRIBIFY_TOKEN_MINT);
        const usdcMint = new PublicKey(USDC_MINT);
        
        // Get all token accounts for TRIBIFY
        const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey);
        
        if (!largestAccounts.value.length) {
          setIsLoading(false);
          return;
        }
        
        // Process each token account
        const holderData = await Promise.all(
          largestAccounts.value.map(async (account) => {
            try {
              const accountInfo = await connection.getParsedAccountInfo(account.address);
              const address = accountInfo.value.data.parsed.info.owner;
              const tokenBalance = Number(account.amount);
              
              // Skip accounts with balance below threshold
              if (tokenBalance < MINIMUM_BALANCE_THRESHOLD) {
                return null;
              }
              
              // Get SOL balance
              const solBalance = await connection.getBalance(new PublicKey(address));
              
              // Get USDC balance
              let usdcBalance = 0;
              try {
                const usdcAta = await getAssociatedTokenAddress(usdcMint, new PublicKey(address));
                const usdcAccount = await connection.getTokenAccountBalance(usdcAta);
                usdcBalance = usdcAccount.value.uiAmount || 0;
              } catch (e) {
                // No USDC account, leave balance as 0
              }

              return {
                address,
                tokenBalance: Number(tokenBalance),
                solBalance: (solBalance / LAMPORTS_PER_SOL) || 0,
                usdcBalance: usdcBalance || 0
              };
            } catch (error) {
              console.error('Error processing token account:', error);
              return null;
            }
          })
        );
        
        // Filter out null values and sort by balance
        const filteredHolders = holderData
          .filter(h => h !== null)
          .sort((a, b) => b.tokenBalance - a.tokenBalance);
        
        if (filteredHolders.length > 0) {
          setTokenHolders(filteredHolders);
        }
      } catch (error) {
        console.error('Failed to scan token holders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!holders || holders.length === 0) {
      scanTokenHolders();
    }
  }, [holders]);

  // Create Set of user's public keys for efficient lookup
  const userWalletsSet = new Set([
    ...(publicKeys || []),
    ...(userWallets || []).map(w => w.publicKey || w),
    publicKey
  ].filter(Boolean));

  console.log('User wallets in Shareholders:', {
    publicKeys,
    userWallets,
    publicKey,
    userWalletsSet: Array.from(userWalletsSet)
  });

  // Function to check if an address belongs to the user
  const isUserWallet = (address) => {
    return userWalletsSet.has(address);
  };

  // Copy address function
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

  // Sort holders by balance
  const sortedHolders = [...(tokenHolders || [])].sort((a, b) => b.tokenBalance - a.tokenBalance);

  console.log('Rendering Shareholders with:', {
    tokenHoldersCount: tokenHolders?.length,
    sortedHoldersCount: sortedHolders?.length,
    isLoading
  });

  // Add this function to handle public name updates
  const handlePublicNameUpdate = (address, newName) => {
    try {
      // Update the public names state
      setPublicNames(prev => ({
        ...prev,
        [address]: {
          name: newName,
          timestamp: Date.now()
        }
      }));

      // Save to localStorage
      localStorage.setItem('publicNames', JSON.stringify({
        ...publicNames,
        [address]: {
          name: newName,
          timestamp: Date.now()
        }
      }));
    } catch (error) {
      console.error('Failed to update public name:', error);
    }
  };

  return (
    <div className="token-holders">
      <h3>$TRIBIFY Shareholders</h3>
      
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">Scanning token holders...</div>
        </div>
      ) : sortedHolders.length === 0 ? (
        <div className="no-data-message">
          <p>No token holders data available. Please make sure your wallet is connected.</p>
          <button 
            className="retry-button"
            onClick={() => {
              setIsLoading(true);
              // Check if we have a connection
              const isConnected = localStorage.getItem('isConnected') === 'true';
              if (!isConnected) {
                // Redirect to landing page for connection
                window.location.href = '/';
                return;
              }
              // Try to fetch token holders again
              const scanHolders = async () => {
                try {
                  const connection = new Connection(
                    process.env.REACT_APP_RPC_URL || 'https://api.mainnet-beta.solana.com',
                    'confirmed'
                  );
                  
                  const mintPubkey = new PublicKey(TRIBIFY_TOKEN_MINT);
                  const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey);
                  
                  if (largestAccounts.value.length > 0) {
                    // Process token holders...
                    // This will trigger the useEffect to fetch holders
                  }
                } catch (error) {
                  console.error('Failed to scan token holders:', error);
                } finally {
                  setIsLoading(false);
                }
              };
              scanHolders();
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="holders-list">
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

          {sortedHolders.map(holder => (
            <div 
              key={holder.address} 
              className={`holder-item ${
                holder.address === '6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7' 
                  ? 'liquidity-pool'
                  : holder.address === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv'
                  ? 'treasury'
                  : userWalletsSet.has(holder.address) 
                  ? 'user-owned' 
                  : ''
              }`}
            >
              <div 
                className="holder-col address clickable"
                onClick={() => copyAddress(holder.address)}
                title="Click to copy address"
              >
                {userWalletsSet.has(holder.address) ? '🔑' : '◈'} {holder.address}
              </div>
              <div className="holder-col percent">
                {((holder.tokenBalance / 1_000_000_000) * 100).toFixed(4)}%
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
                    onBlur={(e) => {
                      handlePublicNameUpdate(holder.address, e.target.value);
                      setEditingPublicName(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handlePublicNameUpdate(holder.address, e.target.value);
                        setEditingPublicName(null);
                      }
                    }}
                  />
                ) : (
                  <span 
                    onClick={() => {
                      // Allow editing for both user wallets and treasury wallet
                      if (userWalletsSet.has(holder.address) || 
                          holder.address === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv') {
                        setEditingPublicName(holder.address);
                      }
                    }}
                    className={userWalletsSet.has(holder.address) || 
                               holder.address === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv' 
                               ? 'editable' : ''}
                  >
                    {publicNames[holder.address]?.name || 
                      ((userWalletsSet.has(holder.address) || 
                        holder.address === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv') 
                        ? '+ Add public name' 
                        : '')}
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
                    onClick={() => setActiveView('messages')}
                  >
                    Message All
                  </button>
                ) : (
                  <button onClick={() => setActiveView('messages')}>
                    Message
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Shareholders; 