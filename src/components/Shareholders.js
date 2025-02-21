import React, { useState, useEffect, useContext } from 'react';
import './Shareholders.css';
import { TribifyContext } from '../context/TribifyContext';
import LoadingIndicator from './LoadingIndicator';

const Shareholders = ({ 
  holders = [],
  nicknames = {},
  setNicknames,
  setActiveView,
  publicKey,
  subwallets = [],
  stakedAddresses = []
}) => {
  const { publicKeys, userWallets = [] } = useContext(TribifyContext);
  const [editingNickname, setEditingNickname] = useState(null);
  const [editingPublicName, setEditingPublicName] = useState(null);
  const [publicNames, setPublicNames] = useState(() => {
    const saved = localStorage.getItem('publicNames');
    return saved ? JSON.parse(saved) : {};
  });
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  console.log('Shareholders received:', {
    publicKey,
    subwallets,
    subwalletCount: subwallets?.length,
    firstSubwallet: subwallets?.[0]
  });

  // Save public names whenever they change
  useEffect(() => {
    localStorage.setItem('publicNames', JSON.stringify(publicNames));
  }, [publicNames]);

  console.log('Shareholders props:', {
    publicKey,
    subwalletsCount: subwallets?.length,
    subwalletAddresses: subwallets?.map(w => w.publicKey?.toString())
  });

  // Create Set of user's public keys for efficient lookup
  const userWalletsSet = new Set(publicKeys || []);

  // Debug log to verify addresses
  console.log('User wallets:', Array.from(userWalletsSet));
  console.log('All holders:', holders.map(h => h.address));

  // Function to check if an address belongs to the user
  const isUserWallet = (address) => {
    return userWalletsSet.has(address);
  };

  // Copy address function
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

  // Sort holders by balance
  const sortedHolders = [...(holders || [])].sort((a, b) => b.tokenBalance - a.tokenBalance);

  // Add this function to handle public name updates
  const handlePublicNameUpdate = (address, newName) => {
    try {
      // Update the public names state
      setPublicNames(prev => ({
        ...prev,
        [address]: {
          name: newName,
          timestamp: Date.now()
        }
      }));

      // Save to localStorage
      localStorage.setItem('publicNames', JSON.stringify({
        ...publicNames,
        [address]: {
          name: newName,
          timestamp: Date.now()
        }
      }));
    } catch (error) {
      console.error('Failed to update public name:', error);
    }
  };

  // Add default name for Liquidity Pool
  const LP_ADDRESS = '6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7';
  const defaultPublicNames = {
    [LP_ADDRESS]: {
      name: 'Liquidity Pool',
      isDefault: true
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 5000);
    
    if (holders && holders.length > 0) {
      clearTimeout(timer);
      setIsLoading(false);
    }

    return () => clearTimeout(timer);
  }, [holders]);

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return (
    <div className="token-holders">
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="holders-list">
        <div className="holder-header">
          <div className="holder-col address">Address</div>
          <div className="holder-col percent">Share</div>
          <div className="holder-col name">Name</div>
          <div className="holder-col public-name">Public Name</div>
          <div className="holder-col balance">TRIBIFY</div>
          <div className="holder-col sol">SOL</div>
          <div className="holder-col usdc">USDC</div>
          <div className="holder-col staked">Staked</div>
          <div className="holder-col message">Message</div>
        </div>

        {sortedHolders.map(holder => (
          <div 
            key={holder.address} 
            className={`holder-item ${
              holder.address === '6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7' 
                ? 'liquidity-pool'
                : holder.address === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv'
                ? 'treasury'
                : userWalletsSet.has(holder.address) 
                ? 'user-owned' 
                : ''
            }`}
          >
            <div 
              className="holder-col address clickable"
              onClick={() => copyAddress(holder.address)}
              title="Click to copy address"
            >
              {userWalletsSet.has(holder.address) ? '🔑' : '◈'} {holder.address}
            </div>
            <div className="holder-col percent">
              {((holder.tokenBalance / 1_000_000_000) * 100).toFixed(4)}%
            </div>
            <div className="holder-col name">
              {editingNickname === holder.address ? (
                <input
                  autoFocus
                  defaultValue={nicknames[holder.address] || ''}
                  onBlur={(e) => {
                    setNicknames(prev => ({...prev, [holder.address]: e.target.value}));
                    setEditingNickname(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setNicknames(prev => ({...prev, [holder.address]: e.target.value}));
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
            <div className="holder-col public-name">
              {holder.address === LP_ADDRESS ? (
                <span>Liquidity Pool</span>
              ) : editingPublicName === holder.address ? (
                <input
                  autoFocus
                  defaultValue={publicNames[holder.address]?.name || ''}
                  onBlur={(e) => {
                    handlePublicNameUpdate(holder.address, e.target.value);
                    setEditingPublicName(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePublicNameUpdate(holder.address, e.target.value);
                      setEditingPublicName(null);
                    }
                  }}
                />
              ) : (
                <span 
                  onClick={() => {
                    // Allow editing for both user wallets and treasury wallet
                    if (userWalletsSet.has(holder.address) || 
                        holder.address === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv') {
                      setEditingPublicName(holder.address);
                    }
                  }}
                  className={userWalletsSet.has(holder.address) || 
                             holder.address === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv' 
                             ? 'editable' : ''}
                >
                  {publicNames[holder.address]?.name || 
                    ((userWalletsSet.has(holder.address) || 
                      holder.address === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv') 
                      ? '+ Add public name' 
                      : '')}
                </span>
              )}
            </div>
            <div className="holder-col balance">
              {holder.tokenBalance.toLocaleString()}
            </div>
            <div className="holder-col sol">
              {holder.solBalance?.toFixed(4) || '0.0000'}
            </div>
            <div className="holder-col usdc">
              $ {holder.usdcBalance?.toFixed(2) || '0.00'}
            </div>
            <div className="holder-col staked">
              <span className={`staked-badge ${stakedAddresses?.includes(holder.address) ? 'yes' : 'no'}`}>
                {stakedAddresses?.includes(holder.address) ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="holder-col message">
              {holder.address === '6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7' ? (
                <button 
                  className="message-all-button"
                  onClick={() => setActiveView('messages')}
                >
                  Message All
                </button>
              ) : (
                <button onClick={() => setActiveView('messages')}>
                  Message
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Shareholders; 