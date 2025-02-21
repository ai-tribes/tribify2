import React, { useContext } from 'react';
import './StakeView.css';
import { TribifyContext } from '../context/TribifyContext';
import { GovernanceContext } from '../context/GovernanceContext';

function StakeView({ parentWallet, tokenHolders }) {
  // Get subwallets from context
  const { subwallets, publicKeys } = useContext(TribifyContext);
  const { motions, stakeForProposal } = useContext(GovernanceContext);

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

  // Handle staking
  const handleStake = async (walletPublicKey, balance) => {
    try {
      console.log(`Staking ${balance} TRIBIFY from ${walletPublicKey}`);
      // Staking logic will go here
    } catch (error) {
      console.error('Staking failed:', error);
    }
  };

  return (
    <div className="stake-view">
      <h2>Staking Dashboard</h2>
      
      <div className="wallets-list">
        {allUserWallets.map((wallet, index) => (
          <div key={wallet.publicKey} className="wallet-row">
            <div className="wallet-address">
              {index === 0 ? '🔑 ' : '◈ '}{wallet.publicKey}
            </div>
            <div className="wallet-balance">
              {formatBalance(wallet.tribifyBalance)} $TRIBIFY
            </div>
            {wallet.tribifyBalance > 0 && (
              <button 
                className="stake-button"
                onClick={() => handleStake(wallet.publicKey, wallet.tribifyBalance)}
              >
                Stake
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add any additional staking UI elements */}
    </div>
  );
}

export default StakeView; 