import React, { useState } from 'react';
import WalletPage from './WalletPage/WalletPage';

function WalletButton() {
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  return (
    <>
      <button 
        className="layout-button"
        onClick={() => setIsWalletOpen(true)}
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: '6px',
          cursor: 'pointer',
          marginRight: '12px',
          fontSize: '14px'
        }}
      >
        Layout
      </button>
      {isWalletOpen && <WalletPage onClose={() => setIsWalletOpen(false)} />}
    </>
  );
}

export default WalletButton; 