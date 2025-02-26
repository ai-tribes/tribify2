import React from 'react';
import PropTypes from 'prop-types';
import './WalletStats.css';

/**
 * WalletStats component for displaying wallet balance statistics
 * 
 * @param {Object} props - Component props
 * @param {Object} props.totals - Object containing total balances for different tokens
 * @returns {JSX.Element} WalletStats component
 */
const WalletStats = ({ totals }) => {
  return (
    <div className="wallet-stats">
      <div className="stat-card">
        <h3>Total SOL Balance</h3>
        <p className="stat-value">{totals.sol.toFixed(4)} SOL</p>
      </div>
      <div className="stat-card">
        <h3>Total USDC Balance</h3>
        <p className="stat-value">${totals.usdc.toFixed(2)}</p>
      </div>
      <div className="stat-card">
        <h3>Total TRIBIFY Balance</h3>
        <p className="stat-value">{totals.tribify.toLocaleString()} TRIBIFY</p>
      </div>
    </div>
  );
};

WalletStats.propTypes = {
  totals: PropTypes.shape({
    sol: PropTypes.number.isRequired,
    usdc: PropTypes.number.isRequired,
    tribify: PropTypes.number.isRequired
  }).isRequired
};

WalletStats.defaultProps = {
  totals: {
    sol: 0,
    usdc: 0,
    tribify: 0
  }
};

export default WalletStats; 