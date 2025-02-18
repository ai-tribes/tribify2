import React, { useState, useEffect } from 'react';
import './Shareholders.css';

const Shareholders = ({ 
  holders = [],
  nicknames = {},
  setNicknames,
  setActiveView,
  publicKey,
  subwallets = []
}) => {
  const [editingNickname, setEditingNickname] = useState(null);
  const [editingPublicName, setEditingPublicName] = useState(null);
  const [publicNames, setPublicNames] = useState(() => {
    const saved = localStorage.getItem('publicNames');
    return saved ? JSON.parse(saved) : {};
  });
  const [notification, setNotification] = useState(null);

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

  // Create Set of user's wallet addresses
  const userWallets = new Set([
    publicKey?.toString(),
    ...(subwallets || []).map(w => {
      const address = w.publicKey?.toString();
      console.log('Processing subwallet:', { wallet: w, address });
      return address;
    }).filter(Boolean)
  ]);

  console.log('Shareholders component:', {
    publicKey: publicKey?.toString(),
    subwalletCount: subwallets?.length,
    userWallets: Array.from(userWallets)
  });

  const isUserWallet = (address) => {
    const normalizedAddress = address?.toString();
    const isOwned = userWallets.has(normalizedAddress);
    console.log(`Checking wallet ${normalizedAddress}:`, {
      isOwned,
      userWallets: Array.from(userWallets),
      addressType: typeof address
    });
    return isOwned;
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
          <div className="holder-col balance">$TRIBIFY</div>
          <div className="holder-col sol">SOL</div>
          <div className="holder-col usdc">USDC</div>
          <div className="holder-col message">Message</div>
        </div>

        {sortedHolders.map(holder => (
          <div 
            key={holder.address} 
            className={`holder-item ${isUserWallet(holder.address) ? 'user-owned' : ''}`}
          >
            <div 
              className="holder-col address clickable"
              onClick={() => copyAddress(holder.address)}
              title="Click to copy address"
            >
              {isUserWallet(holder.address) ? '🔑' : '◈'} {holder.address}
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
              {editingPublicName === holder.address ? (
                <input
                  autoFocus
                  defaultValue={publicNames[holder.address]?.name || ''}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      // Add public name verification here
                      setEditingPublicName(null);
                    }
                  }}
                  onBlur={() => setEditingPublicName(null)}
                  placeholder="Enter & sign to verify"
                />
              ) : (
                <span 
                  onClick={() => {
                    if (isUserWallet(holder.address)) {
                      setEditingPublicName(holder.address);
                    }
                  }}
                  className={isUserWallet(holder.address) ? 'editable' : ''}
                >
                  {publicNames[holder.address]?.name || 
                    (isUserWallet(holder.address) ? '+ Add public name' : '')}
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