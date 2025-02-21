import React, { useState, useCallback } from 'react';
import './StakingLockModal.css';
import { 
  MIN_DURATION, 
  MAX_DURATION, 
  calculateAPY, 
  formatDuration,
  formatSliderLabel 
} from '../utils/staking';

const BASE_APY = 3; // Base APY for minimum stake
const MAX_APY = 25; // Max APY for 4-year stake

const StakingLockModal = ({ wallet, onClose, onStake }) => {
  const [duration, setDuration] = useState(1); // Default to 1 minute
  const apy = calculateAPY(duration);

  const handleSliderChange = useCallback((e) => {
    const value = parseInt(e.target.value);
    setDuration(value);
  }, []);

  // Add handler to prevent clicks inside modal from closing it
  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="staking-modal-overlay" onClick={onClose}>
      <div className="staking-modal" onClick={handleModalClick}>
        <div className="staking-modal-header">
          <h3>Stake TRIBIFY</h3>
          <button className="staking-close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="staking-modal-content">
          <div className="staking-wallet-info">
            <div className="staking-label">Wallet #{wallet?.index}:</div>
            <div className="staking-address">{wallet?.publicKey}</div>
          </div>
          
          <div className="staking-balance">
            <div className="staking-label">Available to Stake:</div>
            <div className="staking-amount">
              {Number(wallet?.tribifyBalance).toLocaleString()} TRIBIFY
            </div>
          </div>

          <div className="staking-duration-selector">
            <h4>Select Lock Duration</h4>
            <div className="duration-input">
              <input
                type="number"
                min={MIN_DURATION}
                max={MAX_DURATION}
                value={duration}
                onChange={(e) => setDuration(Math.min(MAX_DURATION, Math.max(MIN_DURATION, parseInt(e.target.value) || 1)))}
                className="duration-text-input"
              />
              <span className="duration-unit">minutes</span>
            </div>
            <div className="staking-slider-container">
              <input
                type="range"
                min={MIN_DURATION}
                max={MAX_DURATION}
                value={duration}
                onChange={handleSliderChange}
                className="staking-slider"
              />
              <div className="staking-duration-display">
                <span className="duration-label">Lock Period:</span>
                <span className="duration-value">{formatDuration(duration)}</span>
              </div>
              <div className="staking-apy-display">
                <span className="apy-value">{apy.toFixed(3)}% APY</span>
              </div>
            </div>
          </div>

          <button 
            className="staking-confirm-button"
            onClick={() => onStake(wallet.publicKey, wallet.tribifyBalance, duration)}
          >
            Confirm Stake
          </button>

          <div className="staking-warning">
            ⚠️ Early unstaking will result in loss of all staking rewards
          </div>
        </div>
      </div>
    </div>
  );
};

export default StakingLockModal; 