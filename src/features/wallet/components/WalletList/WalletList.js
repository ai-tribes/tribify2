import React from 'react';
import PropTypes from 'prop-types';
import './WalletList.css';

/**
 * WalletList component for displaying a list of wallets with their balances
 * 
 * @param {Object} props - Component props
 * @param {Array} props.wallets - Array of wallet objects to display
 * @param {Function} props.onCopyAddress - Function to handle copying address to clipboard
 * @param {Function} props.onGenerateWallets - Function to handle generating new wallets
 * @param {boolean} props.isLoading - Loading state
 * @returns {JSX.Element} WalletList component
 */
const WalletList = ({ wallets, onCopyAddress, onGenerateWallets, isLoading }) => {
  return (
    <div className="wallet-table">
      <h2>Your Wallets</h2>
      {wallets.length === 0 ? (
        <div className="empty-state">
          <p>No wallets generated yet</p>
          <button 
            className="action-button"
            onClick={onGenerateWallets}
            disabled={isLoading}
          >
            Generate Wallets
          </button>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Public Key</th>
              <th>SOL</th>
              <th>USDC</th>
              <th>TRIBIFY</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {wallets.map((wallet, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{wallet.publicKey}</td>
                <td>{wallet.solBalance.toFixed(4)} SOL</td>
                <td>${wallet.usdcBalance.toFixed(2)}</td>
                <td>{wallet.tribifyBalance.toLocaleString()} TRIBIFY</td>
                <td>
                  <button 
                    className="table-action copy-btn"
                    onClick={() => onCopyAddress(wallet.publicKey)}
                  >
                    Copy
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

WalletList.propTypes = {
  wallets: PropTypes.array.isRequired,
  onCopyAddress: PropTypes.func.isRequired,
  onGenerateWallets: PropTypes.func.isRequired,
  isLoading: PropTypes.bool
};

WalletList.defaultProps = {
  wallets: [],
  isLoading: false
};

export default WalletList; 