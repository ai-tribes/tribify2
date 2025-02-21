import React, { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import './SnipePage.css';

function SnipePage({ publicKey }) {
  // State for snipe targets
  const [targets, setTargets] = useState([]);
  
  // Global snipe settings
  const [settings, setSettings] = useState({
    maxBudget: '',
    slippage: '1',
    priorityFee: '0.000005'
  });

  const connection = new Connection('https://api.mainnet-beta.solana.com');

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
      <div className="snipe-header">
        <h2>Token Sniper</h2>
        <button onClick={addTarget} className="add-target-btn">+ Add Target</button>
      </div>

      <div className="snipe-settings">
        <h3>Global Settings</h3>
        <div className="settings-grid">
          <div className="setting-item">
            <label>Max Budget (SOL)</label>
            <input 
              type="number"
              value={settings.maxBudget}
              onChange={(e) => setSettings({...settings, maxBudget: e.target.value})}
              placeholder="0.1"
            />
          </div>
          <div className="setting-item">
            <label>Slippage %</label>
            <input 
              type="number"
              value={settings.slippage}
              onChange={(e) => setSettings({...settings, slippage: e.target.value})}
              placeholder="1"
            />
          </div>
          <div className="setting-item">
            <label>Priority Fee</label>
            <input 
              type="number"
              value={settings.priorityFee}
              onChange={(e) => setSettings({...settings, priorityFee: e.target.value})}
              placeholder="0.000005"
            />
          </div>
        </div>
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
          <div className="no-targets">
            No targets added. Click "Add Target" to start sniping.
          </div>
        )}
      </div>
    </div>
  );
}

export default SnipePage; 