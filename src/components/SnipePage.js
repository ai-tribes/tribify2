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
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [newTarget, setNewTarget] = useState({
    name: '',
    tokenCA: '',
    description: '',
    votingPeriod: '7',
    minStake: '1000'
  });
  const [proposals, setProposals] = useState([]);

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
        <div className="modal-content wallet-selection-modal">
          <h3>Select Wallets for Sniping</h3>
          <button className="close-btn" onClick={() => setShowMultiSnipeModal(false)}>×</button>
          
          <div className="token-info">
            Token: {currentTokenCA.slice(0,6)}...{currentTokenCA.slice(-4)}
          </div>

          {fundedWallets.length > 0 ? (
            <div className="wallet-selection-grid">
              {fundedWallets.map(wallet => {
                const balance = walletBalances[wallet.publicKey.toString()] / LAMPORTS_PER_SOL;
                const isSelected = selectedWallets[currentTokenCA]?.includes(wallet.publicKey.toString());
                
                return (
                  <div key={wallet.publicKey.toString()} className={`wallet-selection-card ${isSelected ? 'selected' : ''}`}>
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
                  setShowMultiSnipeModal(false);
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

  const handleCreateProposal = () => {
    setProposals(prev => [...prev, {
      ...newTarget,
      proposer: publicKey,
      totalStaked: 0,
      votes: {}
    }]);
    setNewTarget({
      name: '',
      tokenCA: '',
      description: '',
      votingPeriod: '7',
      minStake: '1000'
    });
    setShowProposalModal(false);
  };

  const handleStakeVote = (index, amount) => {
    if (amount > 0) {
      setProposals(prev => {
        const updated = [...prev];
        updated[index].totalStaked += amount;
        updated[index].votes[publicKey] = (updated[index].votes[publicKey] || 0) + amount;
        return updated;
      });
    }
  };

  return (
    <div className="target-page">
      <div className="target-header">
        <h2>Target Coordination</h2>
        <p>This page allows you to coordinate raids on other tribes by targeting their tokens. Automatically convert raided tokens to $TRIBIFY, increasing our token's power.</p>
        <ul>
          <li>Enter token contract addresses to monitor and raid</li>
          <li>Select which subwallets to use for coordinated raids</li>
          <li>Set maximum budget and slippage for each wallet</li>
          <li>Auto-convert raided tokens to $TRIBIFY for maximum impact</li>
        </ul>
      </div>

      <div className="target-content">
        <div className="left-column">
          <div className="proposal-section">
            <button onClick={() => setShowProposalModal(true)} className="propose-target-btn">
              + Propose New Target
            </button>
          </div>

          <div className="voting-section">
            <h3>Vote on Proposals</h3>
            <div className="proposals-list">
              {proposals.map((proposal, index) => (
                <div key={index} className="proposal-card">
                  <h3>{proposal.name}</h3>
                  <p>Token CA: {proposal.tokenCA}</p>
                  <p>{proposal.description}</p>
                  <p>Total Staked: {proposal.totalStaked} TRIBIFY</p>
                  <input
                    type="number"
                    placeholder="Stake TRIBIFY"
                    onChange={(e) => handleStakeVote(index, parseFloat(e.target.value))}
                    className="stake-input"
                  />
                </div>
              ))}
              {proposals.length === 0 && (
                <div className="no-proposals">
                  No target proposals yet. Create one to start!
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="right-column">
          <div className="token-management">
            <h3>Manage Tokens</h3>
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
                    setNewTokenCA('');
                  }
                }}
                className="add-token-btn"
                disabled={!newTokenCA || newTokenCA.length < 32}
              >
                Add Token
              </button>
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
                  No tokens added. Click "Add Token" to start sniping.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showProposalModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Propose New Target</h3>
            <button className="close-btn" onClick={() => setShowProposalModal(false)}>×</button>

            <div className="form-group">
              <label>Target Name</label>
              <input
                type="text"
                value={newTarget.name}
                onChange={(e) => setNewTarget(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter target name"
                className="target-input"
              />
            </div>

            <div className="form-group">
              <label>Token Contract Address (CA)</label>
              <input
                type="text"
                value={newTarget.tokenCA}
                onChange={(e) => setNewTarget(prev => ({ ...prev, tokenCA: e.target.value }))}
                placeholder="Enter token CA"
                className="target-input"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={newTarget.description}
                onChange={(e) => setNewTarget(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Why should we target this token?"
                className="target-textarea"
                rows={4}
              />
            </div>

            <div className="form-group">
              <label>Voting Period (Days)</label>
              <select
                value={newTarget.votingPeriod}
                onChange={(e) => setNewTarget(prev => ({ ...prev, votingPeriod: e.target.value }))}
                className="target-select"
              >
                <option value="3">3 days</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </select>
            </div>

            <div className="form-group">
              <label>Minimum Stake Required (TRIBIFY)</label>
              <input
                type="number"
                value={newTarget.minStake}
                onChange={(e) => setNewTarget(prev => ({ ...prev, minStake: e.target.value }))}
                className="target-input"
                min="1000"
                step="1000"
              />
            </div>

            <button className="create-target-btn" onClick={handleCreateProposal}>
              Propose Target
            </button>
          </div>
        </div>
      )}

      {showMultiSnipeModal && <MultiSnipeModal />}
    </div>
  );
}

export default SnipePage; 