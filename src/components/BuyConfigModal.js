import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import './BuyConfigModal.css';

const BuyConfigModal = ({ onClose, onComplete }) => {
  const [settings, setSettings] = useState({
    // Required Details
    contractAddress: '',
    ataAddress: '',
    rpcUrl: '',
    priorityFee: 0.000001,
    
    // Wallet & Amount Settings
    walletCount: 1,
    minAmount: 0.1,
    maxAmount: 1,
    
    // Transaction Settings
    slippage: 1,
    randomizeOrder: true,
    
    // Time Settings
    startTime: '',
    endTime: '',
    minInterval: 5,
    maxInterval: 30,
    
    // Budget
    maxBudget: 0
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="modal-container">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-content buy-config-modal">
        <div className="modal-header">
          <h3>Configure Automated Buying Sequence</h3>
          <button className="close-modal-button" onClick={onClose}>×</button>
        </div>

        <div className="settings-grid">
          {/* Required Details Section */}
          <div className="settings-section">
            <h4>Required Details</h4>
            <div className="input-group">
              <label>Contract Address</label>
              <input
                type="text"
                name="contractAddress"
                value={settings.contractAddress}
                onChange={handleInputChange}
                placeholder="Token contract address"
              />
            </div>
            <div className="input-group">
              <label>ATA Address</label>
              <input
                type="text"
                name="ataAddress"
                value={settings.ataAddress}
                onChange={handleInputChange}
                placeholder="Associated Token Account"
              />
            </div>
            <div className="input-group">
              <label>RPC URL (Optional)</label>
              <input
                type="text"
                name="rpcUrl"
                value={settings.rpcUrl}
                onChange={handleInputChange}
                placeholder="Your RPC endpoint"
              />
            </div>
          </div>

          {/* Wallet & Amount Settings */}
          <div className="settings-section">
            <h4>Wallet & Amount Settings</h4>
            <div className="input-group">
              <label>Number of Wallets (1-100)</label>
              <input
                type="number"
                name="walletCount"
                value={settings.walletCount}
                onChange={handleInputChange}
                min="1"
                max="100"
              />
            </div>
            <div className="input-group">
              <label>Min Amount</label>
              <input
                type="number"
                name="minAmount"
                value={settings.minAmount}
                onChange={handleInputChange}
                step="0.1"
              />
            </div>
            <div className="input-group">
              <label>Max Amount</label>
              <input
                type="number"
                name="maxAmount"
                value={settings.maxAmount}
                onChange={handleInputChange}
                step="0.1"
              />
            </div>
          </div>

          {/* Transaction Settings */}
          <div className="settings-section">
            <h4>Transaction Settings</h4>
            <div className="input-group">
              <label>Slippage (%)</label>
              <input
                type="number"
                name="slippage"
                value={settings.slippage}
                onChange={handleInputChange}
                step="0.1"
              />
            </div>
            <div className="input-group">
              <label>Priority Fee (SOL)</label>
              <input
                type="number"
                name="priorityFee"
                value={settings.priorityFee}
                onChange={handleInputChange}
                step="0.000001"
              />
            </div>
            <div className="input-group checkbox">
              <label>
                <input
                  type="checkbox"
                  name="randomizeOrder"
                  checked={settings.randomizeOrder}
                  onChange={handleInputChange}
                />
                Randomize Wallet Order
              </label>
            </div>
          </div>

          {/* Time Settings */}
          <div className="settings-section">
            <h4>Time Settings</h4>
            <div className="input-group">
              <label>Start Time</label>
              <input
                type="datetime-local"
                name="startTime"
                value={settings.startTime}
                onChange={handleInputChange}
              />
            </div>
            <div className="input-group">
              <label>End Time</label>
              <input
                type="datetime-local"
                name="endTime"
                value={settings.endTime}
                onChange={handleInputChange}
              />
            </div>
            <div className="input-group">
              <label>Min Interval (seconds)</label>
              <input
                type="number"
                name="minInterval"
                value={settings.minInterval}
                onChange={handleInputChange}
                min="5"
              />
            </div>
            <div className="input-group">
              <label>Max Interval (seconds)</label>
              <input
                type="number"
                name="maxInterval"
                value={settings.maxInterval}
                onChange={handleInputChange}
                min="5"
              />
            </div>
          </div>

          {/* Budget Section */}
          <div className="settings-section">
            <h4>Budget</h4>
            <div className="input-group">
              <label>Maximum Budget (SOL)</label>
              <input
                type="number"
                name="maxBudget"
                value={settings.maxBudget}
                onChange={handleInputChange}
                step="0.1"
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="settings-summary">
          <p>
            Will automatically buy random amounts between {settings.minAmount} and {settings.maxAmount} SOL
            using {settings.walletCount} wallet{settings.walletCount > 1 ? 's' : ''}
          </p>
          <p>
            Buys will occur between {settings.startTime || '(not set)'} and {settings.endTime || '(not set)'}
          </p>
          <p>
            with {settings.minInterval}-{settings.maxInterval} second intervals between transactions
            {settings.randomizeOrder ? ' in random wallet order' : ''}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="button-group">
          <button className="randomize-button">🎲 Randomize</button>
          <button className="save-button">Save Config</button>
          <button className="start-button">Start Buying</button>
        </div>
      </div>
    </div>
  );
};

export default BuyConfigModal; 