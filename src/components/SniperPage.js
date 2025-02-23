import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import './SniperPage.css';

function SniperPage() {
  // Get parent wallet from localStorage
  const parentWalletAddress = localStorage.getItem('tribify_parent_wallet');
  
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
      if (!parentWalletAddress) return;

      try {
        const balance = await connection.getBalance(new PublicKey(parentWalletAddress));
        setWalletBalances(prev => ({
          ...prev,
          [parentWalletAddress]: balance / LAMPORTS_PER_SOL
        }));
      } catch (error) {
        console.error('Error fetching balances:', error);
      }
    };

    fetchBalances();
  }, [parentWalletAddress]);

  const handleAddTarget = () => {
    setTargets(prev => [...prev, {
      id: Date.now(),
      address: '',
      price: '',
      amount: '',
      type: 'below',
      status: 'ready'
    }]);
  };

  const handleUpdateTarget = (id, field, value) => {
    setTargets(prev => prev.map(target => 
      target.id === id ? { ...target, [field]: value } : target
    ));
  };

  const handleRemoveTarget = (id) => {
    setTargets(prev => prev.filter(target => target.id !== id));
  };

  const startSniping = (id) => {
    setTargets(prev => prev.map(target =>
      target.id === id ? { ...target, status: 'sniping' } : target
    ));
  };

  const stopSniping = (id) => {
    setTargets(prev => prev.map(target =>
      target.id === id ? { ...target, status: 'ready' } : target
    ));
  };

  if (!parentWalletAddress) {
    return (
      <div className="snipe-container">
        <div className="no-wallet-message">
          Please connect your wallet to use the sniper
        </div>
      </div>
    );
  }

  return (
    <div className="snipe-container">
      <div className="snipe-layout">
        {/* Wallet Panel */}
        <div className="wallet-panel snipe-panel">
          <h3>Wallet</h3>
          <div className="wallet-info">
            <div className="wallet-address">
              {parentWalletAddress && 
                `${parentWalletAddress.slice(0, 4)}...${parentWalletAddress.slice(-4)}`}
            </div>
            <div className="wallet-balance">
              {walletBalances[parentWalletAddress]?.toFixed(4) || '0.0000'} SOL
            </div>
          </div>
        </div>

        {/* Snipe Panel */}
        <div className="snipe-panel">
          <div className="panel-header">
            <h3>Snipe Targets</h3>
            <button onClick={handleAddTarget} className="add-target-button">
              Add Target
            </button>
          </div>

          <div className="targets-list">
            {targets.map(target => (
              <div key={target.id} className="target-item">
                <div className="target-inputs">
                  <input
                    type="text"
                    placeholder="Token Address"
                    value={target.address}
                    onChange={(e) => handleUpdateTarget(target.id, 'address', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={target.price}
                    onChange={(e) => handleUpdateTarget(target.id, 'price', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={target.amount}
                    onChange={(e) => handleUpdateTarget(target.id, 'amount', e.target.value)}
                  />
                  <select
                    value={target.type}
                    onChange={(e) => handleUpdateTarget(target.id, 'type', e.target.value)}
                  >
                    <option value="below">Buy Below</option>
                    <option value="above">Buy Above</option>
                  </select>
                </div>

                <div className="target-actions">
                  <button 
                    className="remove-target"
                    onClick={() => handleRemoveTarget(target.id)}
                  >
                    ×
                  </button>
                  <button 
                    className={`snipe-button ${target.status}`}
                    onClick={() => target.status === 'ready' ? 
                      startSniping(target.id) : 
                      stopSniping(target.id)}
                  >
                    {target.status === 'ready' ? 'Start' : 
                     target.status === 'sniping' ? 'Stop' : 
                     target.status === 'completed' ? '✓' : '✗'}
                  </button>
                </div>
              </div>
            ))}

            {targets.length === 0 && (
              <div className="no-targets">
                No snipe targets added. Click "Add Target" to start.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SniperPage; 