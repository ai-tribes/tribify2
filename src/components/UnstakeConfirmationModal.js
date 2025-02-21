import React from 'react';
import './UnstakeConfirmationModal.css';
import { formatDuration, calculateRewards } from '../utils/staking';

const UnstakeConfirmationModal = ({ wallet, stake, onConfirm, onClose }) => {
  // Calculate rewards based on actual staked time
  const calculateLostRewards = () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const stakedMinutes = (currentTime - (stake.unlockTime - stake.duration * 60)) / 60;
    return calculateRewards(stake.amount, stake.duration, stakedMinutes);
  };

  const lostRewards = calculateLostRewards();

  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="unstake-modal-overlay" onClick={onClose}>
      <div className="unstake-modal" onClick={handleModalClick}>
        <div className="unstake-modal-header">
          <h3>Early Unstake Warning</h3>
          <button className="unstake-close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="unstake-modal-content">
          <div className="warning-icon">⚠️</div>
          <div className="warning-message">
            <p>You are about to unstake before the lock period ends.</p>
            <p>You will <strong>lose {Number(lostRewards).toLocaleString()} TRIBIFY</strong> in staking rewards.</p>
          </div>
          
          <div className="unstake-details">
            <div className="detail-row">
              <span>Staked Amount:</span>
              <span>{Number(stake.amount).toLocaleString()} TRIBIFY</span>
            </div>
            <div className="detail-row">
              <span>Accumulated Rewards:</span>
              <span className="lost-rewards">{Number(lostRewards).toLocaleString()} TRIBIFY</span>
            </div>
            <div className="detail-row">
              <span>Time remaining:</span>
              <span>{formatDuration(stake.duration)}</span>
            </div>
          </div>

          <div className="unstake-actions">
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button className="confirm-button" onClick={onConfirm}>
              Forfeit Rewards & Unstake
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnstakeConfirmationModal; 