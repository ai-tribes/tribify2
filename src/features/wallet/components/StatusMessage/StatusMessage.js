import React from 'react';
import PropTypes from 'prop-types';
import './StatusMessage.css';

/**
 * StatusMessage component for displaying status messages
 * 
 * @param {Object} props - Component props
 * @param {string} props.message - Message to display
 * @param {string} props.type - Type of message (info, success, error, warning)
 * @returns {JSX.Element|null} StatusMessage component or null if no message
 */
const StatusMessage = ({ message, type }) => {
  if (!message) return null;
  
  return (
    <div className={`status-message ${type}`}>
      {message}
    </div>
  );
};

StatusMessage.propTypes = {
  message: PropTypes.string,
  type: PropTypes.oneOf(['info', 'success', 'error', 'warning'])
};

StatusMessage.defaultProps = {
  message: '',
  type: 'info'
};

export default StatusMessage; 