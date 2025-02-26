import React from 'react';
import './BaseModal.css';

const BaseModal = ({ 
  isOpen, 
  onClose, 
  title,
  leftContent,
  children,
  headerButtons,
  size = 'large' // 'small', 'medium', 'large'
}) => {
  if (!isOpen) return null;

  return (
    <div className="base-modal-container">
      <div className="base-modal-overlay" onClick={onClose} />
      <div className={`base-modal-content ${size}`}>
        {/* Left Side - Optional Guide/Info Panel */}
        {leftContent && (
          <div className="base-modal-left">
            {leftContent}
          </div>
        )}

        {/* Right Side - Main Content */}
        <div className="base-modal-right">
          {/* Header */}
          <div className="base-modal-header">
            <h3>{title}</h3>
            <div className="base-modal-header-buttons">
              {headerButtons}
              <button className="base-modal-close" onClick={onClose}>×</button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="base-modal-body">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseModal; 