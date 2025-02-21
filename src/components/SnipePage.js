import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import './SnipePage.css';

function SnipePage({ publicKey, parentBalance, subwallets = [] }) {
  const [tokens, setTokens] = useState([]); // List of token CAs being sniped
  const [showMultiSnipeModal, setShowMultiSnipeModal] = useState(false);
  const [currentTokenCA, setCurrentTokenCA] = useState('');
  const [newTokenCA, setNewTokenCA] = useState('');
  const [selectedWallets, setSelectedWallets] = useState({});
  const [walletBalances, setWalletBalances] = useState({});

  // Fetch wallet balances
  useEffect(() => {
    const fetchBalances = async () => {
      const connection = new Connection('https://api.mainnet-beta.solana.com');
      const balances = {};
      
      for (const wallet of subwallets) {
        try {
          const balance = await connection.getBalance(wallet.publicKey);
          balances[wallet.publicKey.toString()] = balance;
        } catch (err) {
          console.error(`Error fetching balance: ${err}`);
          balances[wallet.publicKey.toString()] = 0;
        }
      }
      
      setWalletBalances(balances);
    };

    fetchBalances();
  }, [subwallets]);

  // Multi-Snipe Wallet Selection Modal
  const MultiSnipeModal = () => {
    // Filter only wallets with enough SOL (e.g., > 0.01 SOL)
    const fundedWallets = subwallets.filter(wallet => 
      (walletBalances[wallet.publicKey.toString()] / LAMPORTS_PER_SOL) > 0.01
    );

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3>Select Wallets for Sniping</h3>
          <div className="token-info">
            Token: {currentTokenCA.slice(0,6)}...{currentTokenCA.slice(-4)}
          </div>

          {fundedWallets.length > 0 ? (
            <div className="wallet-selection-grid">
              {fundedWallets.map(wallet => {
                const balance = walletBalances[wallet.publicKey.toString()] / LAMPORTS_PER_SOL;
                const isSelected = selectedWallets[currentTokenCA]?.includes(wallet.publicKey.toString());
                
                return (
                  <div key={wallet.publicKey.toString()} className="wallet-selection-card">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const walletAddress = wallet.publicKey.toString();
                        setSelectedWallets(prev => ({
                          ...prev,
                          [currentTokenCA]: e.target.checked
                            ? [...(prev[currentTokenCA] || []), walletAddress]
                            : (prev[currentTokenCA] || []).filter(w => w !== walletAddress)
                        }));
                      }}
                    />
                    <div className="wallet-info">
                      <span className="wallet-address">
                        {wallet.publicKey.toString().slice(0,6)}...{wallet.publicKey.toString().slice(-4)}
                      </span>
                      <span className="wallet-balance">
                        {balance.toFixed(4)} SOL
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-funded-wallets">
              No funded wallets available. Please fund your subwallets first.
              <button 
                onClick={() => {
                  // Navigate to wallet page or show funding modal
                }}
                className="fund-wallets-btn"
              >
                Go to Wallet Page
              </button>
            </div>
          )}

          <div className="modal-buttons">
            <button onClick={() => setShowMultiSnipeModal(false)} className="confirm-btn">
              {fundedWallets.length > 0 ? 'Confirm Selection' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="snipe-container">
      <div className="snipe-header">
        <h2>Token Sniper</h2>
        <div className="token-input-container">
          <input
            type="text"
            value={newTokenCA}
            onChange={(e) => setNewTokenCA(e.target.value)}
            placeholder="Enter Token CA"
            className="token-input"
          />
          <button 
            onClick={() => {
              if (newTokenCA && newTokenCA.length >= 32) { // Basic validation
                setTokens(prev => [...prev, newTokenCA]);
                setCurrentTokenCA(newTokenCA);
                setNewTokenCA('');
                setShowMultiSnipeModal(true);
              }
            }}
            className="add-token-btn"
            disabled={!newTokenCA || newTokenCA.length < 32}
          >
            Add Token
          </button>
        </div>
      </div>

      <div className="tokens-grid">
        {tokens.map(tokenCA => (
          <div key={tokenCA} className="token-card">
            <div className="token-header">
              <span className="token-ca">{tokenCA.slice(0,6)}...{tokenCA.slice(-4)}</span>
              <div className="token-actions">
                <button 
                  onClick={() => {
                    setCurrentTokenCA(tokenCA);
                    setShowMultiSnipeModal(true);
                  }}
                  className="edit-wallets-btn"
                >
                  Edit Wallets
                </button>
                <button 
                  onClick={() => setTokens(tokens.filter(t => t !== tokenCA))}
                  className="remove-token-btn"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="selected-wallets">
              <h4>Sniping Wallets ({selectedWallets[tokenCA]?.length || 0})</h4>
              {selectedWallets[tokenCA]?.map(wallet => (
                <div key={wallet} className="selected-wallet">
                  <span>{wallet.slice(0,6)}...{wallet.slice(-4)}</span>
                  <span>{(walletBalances[wallet] / LAMPORTS_PER_SOL).toFixed(4)} SOL</span>
                </div>
              ))}
              {(!selectedWallets[tokenCA] || selectedWallets[tokenCA].length === 0) && (
                <div className="no-wallets-selected">
                  No wallets selected for sniping
                </div>
              )}
            </div>

            <div className="snipe-settings">
              <div className="settings-grid">
                <div className="setting-field">
                  <label>Max Budget (SOL)</label>
                  <input type="number" placeholder="0.1" />
                </div>
                <div className="setting-field">
                  <label>Slippage %</label>
                  <input type="number" placeholder="1" />
                </div>
                <div className="setting-field">
                  <label>Priority Fee</label>
                  <input type="number" placeholder="0.000005" />
                </div>
              </div>
            </div>

            <button className="start-sniper-btn">
              Start Sniper
            </button>
          </div>
        ))}

        {tokens.length === 0 && (
          <div className="no-tokens">
            No tokens added. Click "+ Add Token" to start sniping.
          </div>
        )}
      </div>

      {showMultiSnipeModal && <MultiSnipeModal />}
    </div>
  );
}

export default SnipePage; 