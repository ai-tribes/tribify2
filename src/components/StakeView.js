import React, { useContext, useState, useEffect } from 'react';
import './StakeView.css';
import { TribifyContext } from '../context/TribifyContext';
import { GovernanceContext } from '../context/GovernanceContext';

function StakeView({ parentWallet, tokenHolders }) {
  const { subwallets, publicKeys } = useContext(TribifyContext);
  const { motions } = useContext(GovernanceContext);
  const [selectedStakeType, setSelectedStakeType] = useState({});
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);

  // Define APY tiers based on lock period
  const APY_TIERS = [
    { months: 1, apy: 8 },
    { months: 3, apy: 15 },
    { months: 6, apy: 25 },
    { months: 12, apy: 40 }
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

  const StakeModal = () => (
    <div className="modal-overlay">
      <div className="stake-modal">
        <div className="modal-header">
          <h3>Stake TRIBIFY</h3>
          <button className="close-button" onClick={() => setShowStakeModal(false)}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="wallet-info">
            <div className="label">Wallet:</div>
            <div className="value">{selectedWallet?.publicKey}</div>
          </div>
          
          <div className="balance-info">
            <div className="label">Available to Stake:</div>
            <div className="value">
              {Number(selectedWallet?.tribifyBalance).toLocaleString()} TRIBIFY
            </div>
          </div>

          <div className="lock-periods">
            <h4>Select Lock Period</h4>
            <div className="apy-tiers">
              {APY_TIERS.map(tier => (
                <button
                  key={tier.months}
                  className="tier-button"
                  onClick={() => handleStake(selectedWallet.publicKey, selectedWallet.tribifyBalance, tier.months)}
                >
                  <div className="months">{tier.months} Month{tier.months > 1 ? 's' : ''}</div>
                  <div className="apy">{tier.apy}% APY</div>
                </button>
              ))}
            </div>
          </div>

          <div className="warning">
            ⚠️ Early unstaking will result in loss of all staking rewards
          </div>
        </div>
      </div>
    </div>
  );

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
      {showStakeModal && <StakeModal />}
    </div>
  );
}

export default StakeView; 