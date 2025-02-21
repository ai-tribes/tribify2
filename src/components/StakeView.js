import React, { useContext, useState, useEffect } from 'react';
import './StakeView.css';
import { TribifyContext } from '../context/TribifyContext';
import { GovernanceContext } from '../context/GovernanceContext';
import StakingLockModal from './StakingLockModal';

function StakeView({ parentWallet, tokenHolders }) {
  const { subwallets, publicKeys } = useContext(TribifyContext);
  const { motions } = useContext(GovernanceContext);
  const [selectedStakeType, setSelectedStakeType] = useState({});
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);

  // Define APY tiers based on lock period
  const APY_TIERS = [
    { months: 1, apy: 3 },
    { months: 3, apy: 5 },
    { months: 6, apy: 8 },
    { months: 12, apy: 12 }
  ];

  // Combine parent wallet with subwallets
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

  const handleStakeClick = (wallet) => {
    setSelectedWallet(wallet);
    setShowStakeModal(true);
  };

  const handleStake = async (walletPublicKey, balance, lockPeriod) => {
    try {
      console.log(`Staking ${balance} TRIBIFY from ${walletPublicKey} for ${lockPeriod} months`);
      // Staking logic here
      setShowStakeModal(false);
    } catch (error) {
      console.error('Staking failed:', error);
    }
  };

  return (
    <div className="stake-view">
      <div className="stake-header">
        <h2>Staking Dashboard</h2>
      </div>
      
      <div className="wallets-list">
        <div className="wallet-row header">
          <div className="wallet-col address">
            <span>Wallet Address</span>
          </div>
          <div className="wallet-col balance">
            <span>Balance</span>
          </div>
          <div className="wallet-col stake">
            <span>Simple Stake</span>
          </div>
          <div className="wallet-col motions">
            <span>Governance Stake</span>
          </div>
        </div>

        {allUserWallets.map((wallet, index) => (
          <div key={wallet.publicKey} className="wallet-row">
            <div className="wallet-col address">
              <span className="wallet-number">{index}</span>
              <span className="wallet-icon">{index === 0 ? '🔑' : '◈'}</span>
              <span className="wallet-address-text">{wallet.publicKey}</span>
            </div>
            
            <div className="wallet-col balance">
              <span className="balance-amount">
                {Number(wallet.tribifyBalance).toLocaleString()}
              </span>
              <span className="balance-symbol">$TRIBIFY</span>
            </div>
            
            <div className="wallet-col stake">
              <button 
                className="stake-button"
                onClick={() => handleStakeClick(wallet)}
              >
                Stake
              </button>
            </div>

            <div className="wallet-col motions">
              <select 
                className="motion-select"
                onChange={(e) => {
                  if (e.target.value) {
                    handleStake(wallet.publicKey, wallet.tribifyBalance, e.target.value);
                  }
                }}
                value={selectedStakeType[wallet.publicKey] || ''}
              >
                <option value="">Select Proposal</option>
                {motions.map(motion => (
                  <option key={motion.id} value={motion.id}>
                    {motion.title} ({motion.votesFor.toLocaleString()} FOR)
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
      {showStakeModal && (
        <StakingLockModal
          wallet={selectedWallet}
          onClose={() => setShowStakeModal(false)}
          onStake={handleStake}
        />
      )}
    </div>
  );
}

export default StakeView; 