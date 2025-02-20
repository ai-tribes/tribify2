import React, { useContext } from 'react';
import './StakeView.css';
import { TribifyContext } from '../context/TribifyContext';

function StakeView({ parentWallet, tokenHolders }) {
  // Get subwallets from context
  const { subwallets, publicKeys } = useContext(TribifyContext);

  // Safe console logging without eval
  console.log('StakeView Context - subwallets:', subwallets);
  console.log('StakeView Context - publicKeys:', publicKeys);
  console.log('StakeView Context - parentWallet:', parentWallet);

  // Safely combine parent wallet with subwallets
  const allUserWallets = [
    {
      publicKey: parentWallet.publicKey,
      tribifyBalance: Number(parentWallet.tribifyBalance) || 0
    },
    ...(Array.isArray(subwallets) ? subwallets : []).map(wallet => {
      const holderData = tokenHolders.find(h => h.address === wallet.publicKey);
      return {
        publicKey: wallet.publicKey,
        tribifyBalance: Number(holderData?.tokenBalance) || 0
      };
    })
  ];

  // Format number safely without eval
  const formatBalance = (balance) => {
    try {
      return Number(balance).toLocaleString();
    } catch (error) {
      return '0';
    }
  };

  return (
    <div className="stake-view">
      <h2>Staking Dashboard</h2>
      
      <div className="wallets-list">
        {allUserWallets.map((wallet, index) => (
          <div key={wallet.publicKey} className="wallet-item">
            <div className="wallet-header">
              {index === 0 ? 'Parent Wallet' : `Subwallet ${index}`}
            </div>
            <div className="wallet-address">
              {wallet.publicKey}
            </div>
            <div className="wallet-balance">
              Balance: {formatBalance(wallet.tribifyBalance)} $TRIBIFY
            </div>
            {/* Add staking controls here */}
          </div>
        ))}
      </div>

      {/* Add any additional staking UI elements */}
    </div>
  );
}

export default StakeView; 