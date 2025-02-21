import React, { useState, useCallback } from 'react';
import './StakingLockModal.css';

const MIN_DURATION = 1; // 1 minute
const MAX_DURATION = 1440 * 365 * 4; // 4 years in minutes
const BASE_APY = 3; // Base APY for minimum stake
const MAX_APY = 25; // Max APY for 4-year stake

const calculateAPY = (minutes) => {
  // Logarithmic curve for APY calculation
  const normalizedDuration = Math.log(minutes) / Math.log(MAX_DURATION);
  const apy = BASE_APY + (MAX_APY - BASE_APY) * normalizedDuration;
  return Math.min(MAX_APY, Math.max(BASE_APY, apy));
};

const formatDuration = (minutes) => {
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hour${minutes >= 120 ? 's' : ''}`;
  if (minutes < 43200) return `${Math.floor(minutes / 1440)} day${minutes >= 2880 ? 's' : ''}`;
  if (minutes < 525600) return `${Math.floor(minutes / 43200)} month${minutes >= 86400 ? 's' : ''}`;
  return `${Math.floor(minutes / 525600)} year${minutes >= 1051200 ? 's' : ''}`;
};

const StakingLockModal = ({ wallet, onClose, onStake }) => {
  const [duration, setDuration] = useState(1440); // Default to 1 day
  const apy = calculateAPY(duration);

  const handleSliderChange = useCallback((e) => {
    const value = parseInt(e.target.value);
    setDuration(value);
  }, []);

  return (
    <div className="staking-modal-overlay">
      <div className="staking-modal">
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
                <span className="apy-value">{apy.toFixed(2)}% APY</span>
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