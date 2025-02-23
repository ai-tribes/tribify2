import React from 'react';
import './WalletPage.css';

function WalletPage({ onClose }) {
  return (
    <div className="wallet-page-overlay">
      <div className="wallet-modal">
        <div className="wallet-modal-header">
          <h2>Wallet Management</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="wallet-modal-content">
          {/* Wallet actions */}
          <div className="wallet-actions">
            <button>Generate Keys</button>
            <button>Backup Keys</button>
            <button>Restore Keys</button>
            <button className="refresh-button">⟳ Refresh Wallets</button>
            <button>Clear Storage & Reset</button>
          </div>

          {/* Trading actions */}
          <div className="trading-actions">
            <button>Fund Subwallets</button>
            <button>Distribute $TRIBIFY</button>
            <button>Configure Buy</button>
            <button>Buy Sequence</button>
            <button>Configure Sell</button>
            <button>Sell Sequence</button>
          </div>

          {/* Conversion sections */}
          <div className="conversion-sections">
            <div className="conversion-group">
              <span>Convert ALL TRIBIFY to:</span>
              <div className="conversion-buttons">
                <button>SOL</button>
                <button>USDC</button>
              </div>
            </div>

            <div className="conversion-group">
              <span>Convert ALL SOL to:</span>
              <div className="conversion-buttons">
                <button>TRIBIFY</button>
                <button>USDC</button>
              </div>
            </div>

            <div className="conversion-group">
              <span>Convert ALL USDC to:</span>
              <div className="conversion-buttons">
                <button>TRIBIFY</button>
                <button>SOL</button>
              </div>
            </div>
          </div>

          {/* Parent wallet info */}
          <div className="parent-wallet-info">
            <h3>Parent Wallet</h3>
            <div className="wallet-details">
              {/* Add wallet address and balance info here */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WalletPage; 