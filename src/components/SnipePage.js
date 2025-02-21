import React, { useState, useContext } from 'react';
import './SnipePage.css';
import { TribifyContext } from '../context/TribifyContext';

// Define the constant
const TRIBIFY_TOKEN_MINT = "672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump";

function SnipePage({ publicKey, tokenHolders }) {
  const [buyConfig, setBuyConfig] = useState({
    amount: '',
    slippage: '1',
    priorityFee: '0.000005',
    maxBudget: ''
  });

  const [snipeTargets, setSnipeTargets] = useState([
    {
      address: TRIBIFY_TOKEN_MINT,
      name: 'TRIBIFY',
      targetPrice: '',
      targetSupply: '',
      condition: 'below' // or 'above'
    }
  ]);

  return (
    <div className="snipe-page">
      <div className="snipe-header">
        <h2>Token Sniper</h2>
        <div className="wallet-info">
          Connected: {publicKey?.slice(0,4)}...{publicKey?.slice(-4)}
        </div>
      </div>

      <div className="snipe-sections">
        <div className="config-section">
          <h3>Buy Configuration</h3>
          <div className="config-form">
            <div className="form-group">
              <label>Amount (SOL)</label>
              <input
                type="number"
                value={buyConfig.amount}
                onChange={(e) => setBuyConfig({
                  ...buyConfig,
                  amount: e.target.value
                })}
                placeholder="0.1"
                step="0.1"
              />
            </div>

            <div className="form-group">
              <label>Slippage %</label>
              <input
                type="number"
                value={buyConfig.slippage}
                onChange={(e) => setBuyConfig({
                  ...buyConfig,
                  slippage: e.target.value
                })}
                placeholder="1"
                step="0.1"
              />
            </div>

            <div className="form-group">
              <label>Priority Fee (SOL)</label>
              <input
                type="number"
                value={buyConfig.priorityFee}
                onChange={(e) => setBuyConfig({
                  ...buyConfig,
                  priorityFee: e.target.value
                })}
                placeholder="0.000005"
                step="0.000001"
              />
            </div>

            <div className="form-group">
              <label>Max Budget (SOL)</label>
              <input
                type="number"
                value={buyConfig.maxBudget}
                onChange={(e) => setBuyConfig({
                  ...buyConfig,
                  maxBudget: e.target.value
                })}
                placeholder="1"
                step="0.1"
              />
            </div>
          </div>
        </div>

        <div className="targets-section">
          <h3>Snipe Targets</h3>
          {snipeTargets.map((target, index) => (
            <div key={target.address} className="target-card">
              <div className="target-header">
                <span className="target-name">{target.name}</span>
                <span className="target-address">{target.address.slice(0,4)}...{target.address.slice(-4)}</span>
              </div>

              <div className="target-conditions">
                <div className="form-group">
                  <label>Target Price</label>
                  <input
                    type="number"
                    value={target.targetPrice}
                    onChange={(e) => {
                      const newTargets = [...snipeTargets];
                      newTargets[index].targetPrice = e.target.value;
                      setSnipeTargets(newTargets);
                    }}
                    placeholder="0.00001"
                    step="0.000001"
                  />
                </div>

                <div className="form-group">
                  <label>Target Supply</label>
                  <input
                    type="number"
                    value={target.targetSupply}
                    onChange={(e) => {
                      const newTargets = [...snipeTargets];
                      newTargets[index].targetSupply = e.target.value;
                      setSnipeTargets(newTargets);
                    }}
                    placeholder="1000000"
                    step="1"
                  />
                </div>

                <select
                  value={target.condition}
                  onChange={(e) => {
                    const newTargets = [...snipeTargets];
                    newTargets[index].condition = e.target.value;
                    setSnipeTargets(newTargets);
                  }}
                >
                  <option value="below">Buy Below</option>
                  <option value="above">Buy Above</option>
                </select>
              </div>

              <div className="target-actions">
                <button className="start-snipe">Start Sniping</button>
                <button className="remove-target">Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SnipePage; 