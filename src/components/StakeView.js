import React, { useContext, useState } from 'react';
import './StakeView.css';
import { TribifyContext } from '../context/TribifyContext';
import { GovernanceContext } from '../context/GovernanceContext';
import StakingLockModal from './StakingLockModal';
import UnstakeConfirmationModal from './UnstakeConfirmationModal';
import { formatDuration } from '../utils/staking';

function StakeView() {
  // Get the parent wallet from localStorage
  const parentWalletAddress = localStorage.getItem('tribify_parent_wallet');
  const { subwallets = [] } = useContext(TribifyContext);
  const { motions = [] } = useContext(GovernanceContext);
  
  const [selectedStakeType, setSelectedStakeType] = useState({});
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [lockedStakes, setLockedStakes] = useState({});
  const [showUnstakeConfirmation, setShowUnstakeConfirmation] = useState(false);
  const [unstakeWallet, setUnstakeWallet] = useState(null);

  // Combine parent wallet with subwallets
  const allUserWallets = [
    {
      publicKey: parentWalletAddress,
      type: 'parent',
      tribifyBalance: 0, // We'll need to fetch this
      label: 'Parent Wallet'
    },
    ...(Array.isArray(subwallets) ? subwallets : []).map((wallet, index) => ({
      publicKey: wallet.publicKey.toString(),
      type: 'sub',
      tribifyBalance: 0, // We'll need to fetch this
      label: `Subwallet ${index + 1}`
    }))
  ];

  const handleStakeClick = (wallet) => {
    if (!wallet) return;
    setSelectedWallet(wallet);
    setShowStakeModal(true);
  };

  const handleStake = async (walletPublicKey, balance, duration) => {
    if (!walletPublicKey) return;
    try {
      const unlockTime = Math.floor(Date.now() / 1000) + (duration * 60);
      
      setLockedStakes(prev => ({
        ...prev,
        [walletPublicKey]: {
          amount: balance,
          duration,
          unlockTime
        }
      }));

      setShowStakeModal(false);
    } catch (error) {
      console.error('Staking failed:', error);
      alert('Failed to stake: ' + error.message);
    }
  };

  const handleUnstakeClick = (walletPublicKey) => {
    const stake = lockedStakes[walletPublicKey];
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (currentTime < stake.unlockTime) {
      setUnstakeWallet(walletPublicKey);
      setShowUnstakeConfirmation(true);
    } else {
      handleUnstake(walletPublicKey);
    }
  };

  const handleUnstake = async (walletPublicKey, forceEarly = false) => {
    try {
      const stake = lockedStakes[walletPublicKey];
      if (!stake) return;

      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime < stake.unlockTime && !forceEarly) {
        throw new Error(`Tokens are locked for ${formatDuration((stake.unlockTime - currentTime) * 60)}`);
      }

      // TODO: Implement actual unstaking transaction
      console.log(`Will unstake ${stake.amount} TRIBIFY from ${walletPublicKey}${forceEarly ? ' (early)' : ''}`);

      // Remove from locked stakes
      setLockedStakes(prev => {
        const newStakes = { ...prev };
        delete newStakes[walletPublicKey];
        return newStakes;
      });

      setShowUnstakeConfirmation(false);

    } catch (error) {
      console.error('Unstaking failed:', error);
      alert('Failed to unstake: ' + error.message);
    }
  };

  const handleMotionSelect = (walletPublicKey, motionId) => {
    setLockedStakes(prev => ({
      ...prev,
      [walletPublicKey]: {
        ...prev[walletPublicKey],
        motionId
      }
    }));
  };

  return (
    <div className="stake-view">
      <div className="stake-header">
        <h2>Staking Dashboard</h2>
        <div className="stake-stats">
          <span>Total Staked: {Object.values(lockedStakes).reduce((sum, stake) => sum + stake.amount, 0).toLocaleString()} TRIBIFY</span>
        </div>
      </div>
      
      <div className="wallets-list">
        <div className="wallet-row header">
          <div className="wallet-col">Address</div>
          <div className="wallet-col">Balance</div>
          <div className="wallet-col">Motion</div>
          <div className="wallet-col">Status</div>
          <div className="wallet-col">Actions</div>
        </div>

        {allUserWallets.map((wallet) => {
          const stake = lockedStakes[wallet.publicKey];
          const currentTime = Math.floor(Date.now() / 1000);
          const isLocked = stake && currentTime < stake.unlockTime;

          return (
            <div key={wallet.publicKey} className="wallet-row">
              <div className="wallet-col address">
                <span className="wallet-type-icon">
                  {wallet.type === 'parent' ? '🔑' : '◈'}
                </span>
                <span className="wallet-address">
                  {wallet.publicKey.slice(0, 6)}...{wallet.publicKey.slice(-4)}
                </span>
                <span className="wallet-label">{wallet.label}</span>
              </div>

              <div className="wallet-col balance">
                {wallet.tribifyBalance?.toLocaleString() || '0'} TRIBIFY
                {stake && <span className="staked-badge">Staked</span>}
              </div>

              <div className="wallet-col motion">
                {stake ? (
                  <select 
                    value={stake.motionId || ''} 
                    onChange={(e) => handleMotionSelect(wallet.publicKey, e.target.value)}
                    className="motion-select"
                  >
                    <option value="">Select Motion</option>
                    {motions.map(motion => (
                      <option key={motion.id} value={motion.id}>
                        Motion #{motion.id}: {motion.title.slice(0, 30)}...
                      </option>
                    ))}
                  </select>
                ) : '-'}
              </div>

              <div className="wallet-col status">
                {!stake ? (
                  <span className="status-badge unstaked">Unstaked</span>
                ) : isLocked ? (
                  <span className="status-badge locked">
                    Locked ({formatDuration((stake.unlockTime - currentTime) * 60)} left)
                  </span>
                ) : (
                  <span className="status-badge unlocked">Ready to Unstake</span>
                )}
              </div>

              <div className="wallet-col actions">
                {!stake ? (
                  <button 
                    onClick={() => handleStakeClick(wallet)}
                    className="stake-button"
                  >
                    Stake
                  </button>
                ) : (
                  <button 
                    onClick={() => handleUnstakeClick(wallet.publicKey)}
                    className={`unstake-button ${isLocked ? 'locked' : ''}`}
                  >
                    {isLocked ? 'Unstake Early' : 'Unstake'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showStakeModal && (
        <StakingLockModal
          wallet={selectedWallet}
          onClose={() => setShowStakeModal(false)}
          onStake={handleStake}
        />
      )}
      {showUnstakeConfirmation && (
        <UnstakeConfirmationModal
          wallet={unstakeWallet}
          stake={lockedStakes[unstakeWallet]}
          onConfirm={() => handleUnstake(unstakeWallet, true)}
          onClose={() => setShowUnstakeConfirmation(false)}
        />
      )}
    </div>
  );
}

export default StakeView; 