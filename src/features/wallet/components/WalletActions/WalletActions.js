import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import './WalletActions.css';

/**
 * WalletActions component for wallet-related operations
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onGenerateWallets - Function to handle generating new wallets
 * @param {Function} props.onRefreshWallets - Function to handle refreshing wallet balances
 * @param {Function} props.onBackupWallets - Function to handle backing up wallets
 * @param {Function} props.onRestoreWallets - Function to handle restoring wallets
 * @param {boolean} props.isLoading - Loading state
 * @returns {JSX.Element} WalletActions component
 */
const WalletActions = ({ 
  onGenerateWallets, 
  onRefreshWallets, 
  onBackupWallets,
  onRestoreWallets,
  isLoading 
}) => {
  // Create a ref for the file input
  const fileInputRef = useRef(null);

  // Trigger file input click
  const handleRestoreClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return (
    <div className="wallet-actions-container">
      <button 
        className="action-button generate-button"
        onClick={onGenerateWallets}
        disabled={isLoading}
      >
        Generate Wallets
      </button>
      <button 
        className="action-button refresh-button"
        onClick={onRefreshWallets}
        disabled={isLoading}
      >
        Refresh
      </button>
      <button 
        className="action-button backup-button"
        onClick={onBackupWallets}
        disabled={isLoading}
      >
        Backup
      </button>
      <button 
        className="action-button restore-button"
        onClick={handleRestoreClick}
        disabled={isLoading}
      >
        Restore
      </button>
      
      {/* Hidden file input for restore */}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={onRestoreWallets}
        accept=".json"
        style={{ display: 'none' }}
      />
    </div>
  );
};

WalletActions.propTypes = {
  onGenerateWallets: PropTypes.func.isRequired,
  onRefreshWallets: PropTypes.func.isRequired,
  onBackupWallets: PropTypes.func,
  onRestoreWallets: PropTypes.func,
  isLoading: PropTypes.bool
};

WalletActions.defaultProps = {
  onBackupWallets: () => {},
  onRestoreWallets: () => {},
  isLoading: false
};

export default WalletActions; 