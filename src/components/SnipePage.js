import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import './SnipePage.css';

function SnipePage({ publicKey, parentBalance, subwallets = [] }) {
  // State for snipe targets
  const [targets, setTargets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  
  // Global snipe settings
  const [settings, setSettings] = useState({
    maxBudget: '',
    slippage: '1',
    priorityFee: '0.000005'
  });

  // Add wallet balances state
  const [walletBalances, setWalletBalances] = useState({});

  const connection = new Connection('https://api.mainnet-beta.solana.com');

  // Fetch balances for all wallets
  useEffect(() => {
    const fetchBalances = async () => {
      if (!publicKey) return;

      const balances = {};
      try {
        // Parent wallet - use the passed balance
        balances[publicKey] = parentBalance * LAMPORTS_PER_SOL;
        
        // Subwallets (if any)
        if (subwallets && subwallets.length > 0) {
          for (const wallet of subwallets) {
            if (wallet && wallet.publicKey) {
              try {
                const balance = await connection.getBalance(wallet.publicKey);
                balances[wallet.publicKey.toString()] = balance;
              } catch (err) {
                console.error(`Error fetching balance for ${wallet.publicKey.toString()}: `, err);
                balances[wallet.publicKey.toString()] = 0;
              }
            }
          }
        }
        setWalletBalances(balances);
      } catch (error) {
        console.error('Error fetching balances:', error);
      }
    };
    fetchBalances();
  }, [publicKey, subwallets, parentBalance]);

  const getPrice = async (tokenAddress) => {
    try {
      const response = await fetch(`https://quote-api.jup.ag/v4/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${tokenAddress}&amount=1000000000&slippageBps=${parseInt(settings.slippage * 100)}`);
      const data = await response.json();
      return data.data ? data.data.price : null;
    } catch (error) {
      console.error('Price fetch error:', error);
      return null;
    }
  };

  // Price monitoring interval
  useEffect(() => {
    const interval = setInterval(async () => {
      // Check each target
      const updatedTargets = await Promise.all(targets.map(async target => {
        if (target.status !== 'sniping') return target;

        try {
          const currentPrice = await getPrice(target.address);
          if (!currentPrice) return target;

          // Check if price meets condition
          const shouldBuy = target.condition === 'below' ? 
            currentPrice <= target.price :
            currentPrice >= target.price;

          if (shouldBuy) {
            // Here we would execute the buy through Jupiter API
            // For now, just mark as completed
            return {
              ...target,
              status: 'completed'
            };
          }

          return target;

        } catch (error) {
          console.error('Snipe error:', error);
          return { ...target, status: 'error' };
        }
      }));

      setTargets(updatedTargets);
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [targets, settings]);

  const addTarget = () => {
    setTargets([...targets, {
      id: Date.now(),
      address: '',
      price: '',
      amount: '',
      condition: 'below', // 'below' or 'above'
      status: 'ready' // 'ready', 'sniping', 'completed', 'error'
    }]);
  };

  const removeTarget = (id) => {
    setTargets(targets.filter(t => t.id !== id));
  };

  const startSniping = (targetId) => {
    const newTargets = targets.map(t => 
      t.id === targetId ? { ...t, status: 'sniping' } : t
    );
    setTargets(newTargets);
  };

  const stopSniping = (targetId) => {
    const newTargets = targets.map(t => 
      t.id === targetId ? { ...t, status: 'ready' } : t
    );
    setTargets(newTargets);
  };

  return (
    <div className="snipe-container">
      <h2 className="snipe-title">Token Sniper</h2>

      <div className="snipe-layout">
        {/* Left Panel - Wallet Selection */}
        <div className="snipe-panel wallet-panel">
          <h3>Select Snipe Wallet</h3>
          <div className="wallet-option">
            <div className="wallet-label">Parent</div>
            <div className="wallet-address">
              {publicKey.slice(0,6)}...{publicKey.slice(-4)}
            </div>
            <div className="wallet-balance">
              {parentBalance.toFixed(4)} SOL
            </div>
            <button className="fund-btn" disabled>Parent</button>
          </div>
          
          {subwallets && subwallets.map(wallet => (
            wallet && wallet.publicKey && (
              <div key={wallet.publicKey.toString()}
                   className={`wallet-option ${selectedWallet === wallet.publicKey.toString() ? 'selected' : ''}`}
                   onClick={() => setSelectedWallet(wallet.publicKey.toString())}>
                <div className="wallet-label">Subwallet</div>
                <div className="wallet-address">
                  {wallet.publicKey.toString().slice(0,6)}...{wallet.publicKey.toString().slice(-4)}
                </div>
                <div className="wallet-balance">
                  {(walletBalances[wallet.publicKey.toString()] / 1e9 || 0).toFixed(4)} SOL
                </div>
                <button className="fund-btn">Fund</button>
              </div>
            )
          ))}
        </div>

        {/* Right Panel - Snipe Interface */}
        <div className="snipe-panel main-panel">
          {selectedWallet ? (
            <>
              {/* Settings Section */}
              <div className="settings-section">
                <h3>Global Settings</h3>
                <div className="settings-grid">
                  <div className="setting-field">
                    <label>Max Budget (SOL)</label>
                    <input type="number" value={settings.maxBudget}
                           onChange={(e) => setSettings({...settings, maxBudget: e.target.value})}
                           placeholder="0.1" />
                  </div>
                  <div className="setting-field">
                    <label>Slippage %</label>
                    <input type="number" value={settings.slippage}
                           onChange={(e) => setSettings({...settings, slippage: e.target.value})}
                           placeholder="1" />
                  </div>
                  <div className="setting-field">
                    <label>Priority Fee</label>
                    <input type="number" value={settings.priorityFee}
                           onChange={(e) => setSettings({...settings, priorityFee: e.target.value})}
                           placeholder="0.000005" />
                  </div>
                </div>
              </div>

              {/* Targets Section */}
              <div className="targets-section">
                <div className="targets-header">
                  <h3>Snipe Targets</h3>
                  <button className="add-target-btn" onClick={addTarget}>
                    + Add Target
                  </button>
                </div>

                <div className="targets-list">
                  {targets.map(target => (
                    <div key={target.id} className="target-card">
                      <div className="target-header">
                        <input 
                          type="text" 
                          placeholder="Token Address"
                          value={target.address}
                          onChange={(e) => {
                            const newTargets = targets.map(t => 
                              t.id === target.id ? {...t, address: e.target.value} : t
                            );
                            setTargets(newTargets);
                          }}
                        />
                        <button onClick={() => removeTarget(target.id)} className="remove-btn">×</button>
                      </div>

                      <div className="target-body">
                        <div className="input-group">
                          <label>Price</label>
                          <input 
                            type="number"
                            value={target.price}
                            onChange={(e) => {
                              const newTargets = targets.map(t => 
                                t.id === target.id ? {...t, price: e.target.value} : t
                              );
                              setTargets(newTargets);
                            }}
                            placeholder="0.00001"
                          />
                        </div>

                        <div className="input-group">
                          <label>Amount</label>
                          <input 
                            type="number"
                            value={target.amount}
                            onChange={(e) => {
                              const newTargets = targets.map(t => 
                                t.id === target.id ? {...t, amount: e.target.value} : t
                              );
                              setTargets(newTargets);
                            }}
                            placeholder="100"
                          />
                        </div>

                        <select
                          value={target.condition}
                          onChange={(e) => {
                            const newTargets = targets.map(t => 
                              t.id === target.id ? {...t, condition: e.target.value} : t
                            );
                            setTargets(newTargets);
                          }}
                        >
                          <option value="below">Buy Below</option>
                          <option value="above">Buy Above</option>
                        </select>
                      </div>

                      <div className="target-footer">
                        <button 
                          className={`snipe-btn ${target.status}`}
                          onClick={() => target.status === 'ready' ? 
                            startSniping(target.id) : 
                            stopSniping(target.id)}
                        >
                          {target.status === 'ready' ? 'Start Sniping' : 
                           target.status === 'sniping' ? 'Stop Sniping' : 
                           target.status === 'completed' ? 'Completed' : 'Error'}
                        </button>
                      </div>
                    </div>
                  ))}

                  {targets.length === 0 && (
                    <div className="empty-state">
                      No targets added. Click "Add Target" to start sniping.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              Select a wallet from the left to start sniping
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SnipePage; 