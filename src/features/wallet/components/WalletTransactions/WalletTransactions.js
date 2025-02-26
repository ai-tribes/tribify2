import React from 'react';
import PropTypes from 'prop-types';
import './WalletTransactions.css';

/**
 * WalletTransactions component for displaying transaction history
 * 
 * @param {Object} props - Component props
 * @param {Array} props.transactions - Array of transaction objects
 * @param {boolean} props.isLoading - Loading state
 * @returns {JSX.Element} WalletTransactions component
 */
const WalletTransactions = ({ transactions, isLoading }) => {
  /**
   * Format date to readable format
   * @param {string} dateString ISO date string
   * @returns {string} Formatted date
   */
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };
  
  if (isLoading) {
    return (
      <div className="wallet-transactions">
        <h2>Recent Transactions</h2>
        <div className="transactions-loading">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="wallet-transactions">
      <h2>Recent Transactions</h2>
      
      {transactions.length === 0 ? (
        <div className="no-transactions">
          <p>No transactions found</p>
        </div>
      ) : (
        <div className="transactions-table">
          <div className="transaction-header">Date</div>
          <div className="transaction-header">Type</div>
          <div className="transaction-header">Amount</div>
          <div className="transaction-header">Token</div>
          <div className="transaction-header">Status</div>
          
          {transactions.map((tx, index) => (
            <React.Fragment key={tx.signature || `tx-${index}`}>
              <div className="transaction-row">{formatDate(tx.timestamp)}</div>
              <div className="transaction-row">{tx.type === 'send' ? 'Sent' : 'Received'}</div>
              <div className="transaction-row">
                <span className={`tx-amount ${tx.type}`}>
                  {tx.type === 'send' ? '-' : '+'}{tx.amount}
                </span>
              </div>
              <div className="transaction-row">{tx.token}</div>
              <div className="transaction-row">
                <span className={`tx-status ${tx.status}`}>{tx.status}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

WalletTransactions.propTypes = {
  transactions: PropTypes.arrayOf(
    PropTypes.shape({
      signature: PropTypes.string,
      timestamp: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['send', 'receive', 'swap', 'stake', 'unstake']).isRequired,
      amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      token: PropTypes.string.isRequired,
      status: PropTypes.oneOf(['confirmed', 'pending', 'failed']).isRequired
    })
  ),
  isLoading: PropTypes.bool
};

WalletTransactions.defaultProps = {
  transactions: [],
  isLoading: false
};

export default WalletTransactions; 