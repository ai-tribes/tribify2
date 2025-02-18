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
    <div className="stake-container">
      <div className="stake-header">
        <h3>Stake Your TRIBIFY Holdings</h3>
        <p className="stake-description">
          Stake TRIBIFY tokens from any of your wallets to participate in governance.
          Staked tokens are locked until the proposal is completed or cancelled.
        </p>
      </div>

      <div className="wallets-grid">
        {/* Parent Wallet - This MUST have TRIBIFY */}
        <div className="wallet-row parent">
          <div className="wallet-info">
            <div className="wallet-label">Connected Wallet</div>
            <div className="wallet-address">{parentWallet.publicKey}</div>
          </div>
          <div className="wallet-balance">
            {parentWallet.tribifyBalance?.toLocaleString()} TRIBIFY
          </div>
          <button 
            className="stake-action-button"
            onClick={() => handleStake(parentWallet.publicKey, parentWallet.tribifyBalance)}
            disabled={stakingStatus[parentWallet.publicKey] === 'pending'}
          >
            {stakingStatus[parentWallet.publicKey] === 'pending' ? 'Staking...' : 'Stake'}
          </button>
        </div>

        {/* Their Subwallets */}
        <div className="subwallets-section">
          <h4>Your Subwallets</h4>
          {subwallets.map((wallet, index) => (
            <div key={wallet.publicKey} className="wallet-row">
              <div className="wallet-info">
                <div className="wallet-label">Subwallet #{index + 1}</div>
                <div className="wallet-address">{wallet.publicKey}</div>
              </div>
              <div className="wallet-balance">
                {wallet.tribifyBalance?.toLocaleString()} TRIBIFY
              </div>
              {wallet.tribifyBalance > 0 ? (
                <button 
                  className="stake-action-button"
                  onClick={() => handleStake(wallet.publicKey, wallet.tribifyBalance)}
                  disabled={stakingStatus[wallet.publicKey] === 'pending'}
                >
                  {stakingStatus[wallet.publicKey] === 'pending' ? 'Staking...' : 'Stake'}
                </button>
              ) : (
                <button 
                  className="distribute-button"
                  onClick={() => {/* Add distribute action */}}
                >
                  Distribute TRIBIFY
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Maybe add active proposals section here? */}
    </div>
  );
};

export default StakeView; 