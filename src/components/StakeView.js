import React, { useContext, useState, useEffect } from 'react';
import './StakeView.css';
import { TribifyContext } from '../context/TribifyContext';
import { GovernanceContext } from '../context/GovernanceContext';
import StakingLockModal from './StakingLockModal';
import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { formatDuration } from '../utils/staking';
import BN from 'bn.js';
import UnstakeConfirmationModal from './UnstakeConfirmationModal';

// ShareholdersDisplay component - Simplified version without navigation
const ShareholdersDisplay = ({ holders = [], stakedAddresses = [], publicKey, nicknames = {}, setNicknames, subwallets = [] }) => {
  const [editingNickname, setEditingNickname] = useState(null);
  const [notification, setNotification] = useState(null);

  // Create Set of user's public keys for efficient lookup
  const userWalletsSet = new Set([
    publicKey,
    ...(subwallets || []).map(w => w?.publicKey?.toString()).filter(Boolean)
  ]);

  const copyAddress = async (address) => {
    try {
      await navigator.clipboard.writeText(address);
      setNotification({
        message: 'Address copied to clipboard!',
        type: 'success'
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      setNotification({
        message: 'Failed to copy address',
        type: 'error'
      });
    }
  };

  // Filter out any invalid holders and sort them
  const sortedHolders = [...holders]
    .filter(holder => holder && holder.address && holder.tokenBalance != null)
    .sort((a, b) => (b.tokenBalance || 0) - (a.tokenBalance || 0));

  if (!sortedHolders.length) {
    return (
      <div className="holders-list">
        <div className="holder-header">
          <div className="holder-col">No holders data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="holders-list">
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="holder-header">
        <div className="holder-col address">Address</div>
        <div className="holder-col percent">Share</div>
        <div className="holder-col name">Name</div>
        <div className="holder-col balance">TRIBIFY</div>
        <div className="holder-col sol">SOL</div>
        <div className="holder-col usdc">USDC</div>
        <div className="holder-col staked">Staked</div>
      </div>

      {sortedHolders.map((holder) => (
        <div 
          key={holder.address} 
          className={`holder-item ${userWalletsSet.has(holder.address) ? 'user-owned' : ''}`}
        >
          <div 
            className="holder-col address clickable"
            onClick={() => copyAddress(holder.address)}
            title="Click to copy address"
          >
            {userWalletsSet.has(holder.address) ? '🔑' : '◈'} {holder.address}
          </div>
          <div className="holder-col percent">
            {((holder.tokenBalance || 0) / 1_000_000_000 * 100).toFixed(4)}%
          </div>
          <div className="holder-col name">
            {editingNickname === holder.address ? (
              <input
                autoFocus
                defaultValue={nicknames[holder.address] || ''}
                onBlur={(e) => {
                  setNicknames?.(prev => ({...prev, [holder.address]: e.target.value}));
                  setEditingNickname(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setNicknames?.(prev => ({...prev, [holder.address]: e.target.value}));
                    setEditingNickname(null);
                  }
                }}
              />
            ) : (
              <span onClick={() => setEditingNickname(holder.address)}>
                {nicknames[holder.address] || '+ Add name'}
              </span>
            )}
          </div>
          <div className="holder-col balance">
            {(holder.tokenBalance || 0).toLocaleString()}
          </div>
          <div className="holder-col sol">
            {(holder.solBalance || 0).toFixed(4)}
          </div>
          <div className="holder-col usdc">
            $ {(holder.usdcBalance || 0).toFixed(2)}
          </div>
          <div className="holder-col staked">
            <span className={`staked-badge ${stakedAddresses?.includes(holder.address) ? 'yes' : 'no'}`}>
              {stakedAddresses?.includes(holder.address) ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

function StakeView({ parentWallet, tokenHolders, nicknames, setNicknames }) {
  const { subwallets, publicKeys } = useContext(TribifyContext);
  const { motions } = useContext(GovernanceContext);
  const [selectedStakeType, setSelectedStakeType] = useState({});
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [lockedStakes, setLockedStakes] = useState({});
  const [showUnstakeConfirmation, setShowUnstakeConfirmation] = useState(false);
  const [unstakeWallet, setUnstakeWallet] = useState(null);

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

  // Get array of staked addresses
  const stakedAddresses = Object.keys(lockedStakes);

  const handleStakeClick = (wallet) => {
    setSelectedWallet(wallet);
    setShowStakeModal(true);
  };

  const handleStake = async (walletPublicKey, balance, duration) => {
    try {
      // Duration is in minutes, store it directly
      const unlockTime = Math.floor(Date.now() / 1000) + (duration * 60);
      
      setLockedStakes(prev => ({
        ...prev,
        [walletPublicKey]: {
          amount: balance,
          duration, // Original duration in minutes
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

  return (
    <div className="stake-view">
      <div className="stake-header">
        <h2>Staking Dashboard</h2>
      </div>
      
      {/* Use ShareholdersDisplay instead of Shareholders */}
      <ShareholdersDisplay 
        holders={tokenHolders}
        stakedAddresses={stakedAddresses}
        publicKey={parentWallet.publicKey}
        nicknames={nicknames}
        setNicknames={setNicknames}
        subwallets={subwallets}
      />

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
              {lockedStakes[wallet.publicKey] ? (
                <div className="stake-status">
                  <button 
                    className="unstake-button"
                    onClick={() => handleUnstakeClick(wallet.publicKey)}
                  >
                    Unstake
                  </button>
                  <div className="lock-info">
                    <span className="locked-amount">
                      {Number(lockedStakes[wallet.publicKey].amount).toLocaleString()} TRIBIFY
                    </span>
                    <span className="unlock-time">
                      {/* Remove "minutes" since formatDuration already includes it */}
                      Unlocks in {formatDuration(Math.floor((lockedStakes[wallet.publicKey].duration)))}
                    </span>
                  </div>
                </div>
              ) : (
                <button 
                  className="stake-button"
                  onClick={() => handleStakeClick(wallet)}
                >
                  Stake
                </button>
              )}
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
                disabled={lockedStakes[wallet.publicKey]}
              >
                <option value="">
                  {lockedStakes[wallet.publicKey] 
                    ? "Tokens locked in stake" 
                    : "Select Proposal"
                  }
                </option>
                {!lockedStakes[wallet.publicKey] && motions.map(motion => (
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