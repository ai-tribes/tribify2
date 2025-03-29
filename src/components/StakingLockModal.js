import React, { useState } from 'react';
import './StakingLockModal.css';

function StakingLockModal({ isOpen, onClose, wallet, onStake, apyTiers }) {
  const [selectedTier, setSelectedTier] = useState(null);
  const [amount, setAmount] = useState(wallet?.tribifyBalance || 0);

  const handleStake = () => {
    if (!selectedTier) return;
    const duration = selectedTier.months * 30 * 24 * 60; // Convert months to minutes
    onStake(wallet.publicKey.toString(), amount, duration);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Stake TRIBIFY</h3>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="wallet-summary">
            <div className="summary-label">Wallet</div>
            <div className="summary-value">{wallet.publicKey.toString()}</div>
            <div className="summary-label">Available Balance</div>
            <div className="summary-value">{wallet.tribifyBalance.toLocaleString()} TRIBIFY</div>
          </div>

          <div className="stake-amount">
            <label>Amount to Stake</label>
            <div className="amount-input-wrapper">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Math.min(Number(e.target.value), wallet.tribifyBalance))}
                max={wallet.tribifyBalance}
              />
              <button 
                className="max-button"
                onClick={() => setAmount(wallet.tribifyBalance)}
              >
                MAX
              </button>
            </div>
          </div>

          <div className="lock-period">
            <h4>Select Lock Period</h4>
            <div className="apy-tiers">
              {apyTiers.map((tier) => (
                <div
                  key={tier.months}
                  className={`tier-card ${selectedTier?.months === tier.months ? 'selected' : ''}`}
                  onClick={() => setSelectedTier(tier)}
                >
                  <div className="tier-months">{tier.months} Month{tier.months > 1 ? 's' : ''}</div>
                  <div className="tier-apy">{tier.apy}% APY</div>
                  <div className="tier-description">{tier.description}</div>
                </div>
              ))}
            </div>
          </div>

          {selectedTier && (
            <div className="stake-summary">
              <div className="summary-row">
                <span>Lock Period</span>
                <span>{selectedTier.months} Months</span>
              </div>
              <div className="summary-row">
                <span>APY Rate</span>
                <span>{selectedTier.apy}%</span>
              </div>
              <div className="summary-row">
                <span>Projected Rewards</span>
                <span>{((amount * selectedTier.apy) / 100).toLocaleString()} TRIBIFY</span>
              </div>
              <div className="summary-row total">
                <span>Total at Unlock</span>
                <span>{(amount + (amount * selectedTier.apy) / 100).toLocaleString()} TRIBIFY</span>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>Cancel</button>
          <button 
            className="stake-button" 
            onClick={handleStake}
            disabled={!selectedTier || !amount}
          >
            Stake {amount.toLocaleString()} TRIBIFY
          </button>
        </div>
      </div>
    </div>
  );
}

export default StakingLockModal; 