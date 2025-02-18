import React, { useState } from 'react';
import './StakeView.css';

const StakeView = ({ parentWallet, subwallets, tokenHolders, onStake }) => {
  const [stakingStatus, setStakingStatus] = useState({});

  // Debug logging
  console.log('Subwallets in StakeView:', subwallets);
  console.log('TokenHolders:', tokenHolders);
  
  // Filter to show only wallets with TRIBIFY
  const walletsWithBalances = subwallets.map(wallet => ({
    ...wallet,
    tribifyBalance: tokenHolders.find(h => h.address === wallet.publicKey)?.tokenBalance || 0
  }));

  const handleStake = async (walletPublicKey, amount) => {
    try {
      setStakingStatus(prev => ({
        ...prev,
        [walletPublicKey]: 'pending'
      }));

      // Will implement actual staking logic later
      // This will need:
      // 1. Create staking instruction
      // 2. Get user to sign with Phantom
      // 3. Send and confirm transaction
      
      setStakingStatus(prev => ({
        ...prev,
        [walletPublicKey]: 'success'
      }));
    } catch (error) {
      console.error('Staking failed:', error);
      setStakingStatus(prev => ({
        ...prev,
        [walletPublicKey]: 'failed'
      }));
    }
  };

  return (
    <div className="stake-view">
      <h3>Your Wallets</h3>
      
      {/* Parent Wallet */}
      <div className="wallet-item parent-wallet">
        <div className="wallet-address">
          {parentWallet.publicKey} (Parent)
        </div>
        <div className="wallet-balance">
          Balance: {parentWallet.tribifyBalance?.toLocaleString()} $TRIBIFY
        </div>
      </div>

      {/* Subwallets */}
      {subwallets?.map(wallet => {
        const holderInfo = tokenHolders?.find(h => h.address === wallet.publicKey?.toString());
        return (
          <div key={wallet.publicKey} className="wallet-item subwallet">
            <div className="wallet-address">
              {wallet.publicKey?.toString()}
            </div>
            <div className="wallet-balance">
              Balance: {holderInfo?.tokenBalance?.toLocaleString() || 0} $TRIBIFY
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StakeView; 