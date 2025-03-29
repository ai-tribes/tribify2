import React, { useState, useEffect } from 'react';
import './HoldersList.css';

function HoldersList({ holders, onNodeClick, nicknames, setNicknames }) {
  const [activeTab, setActiveTab] = useState('tribify');
  const [targetTokens, setTargetTokens] = useState([]);
  const [allHolders, setAllHolders] = useState({
    tribify: holders,
    // Other token holders will be added dynamically
  });

  useEffect(() => {
    // Load target tokens from localStorage (synced with Sniper)
    const savedTargets = localStorage.getItem('sniper_targets');
    if (savedTargets) {
      const targets = JSON.parse(savedTargets);
      const activeTargets = targets.filter(t => t.isActive);
      setTargetTokens(activeTargets);
      
      // Initialize holders for each target
      const newHolders = { tribify: holders };
      activeTargets.forEach(target => {
        newHolders[target.address] = []; // Will be populated when tab is selected
      });
      setAllHolders(newHolders);
    }
  }, []);

  // Update TRIBIFY holders when props change
  useEffect(() => {
    setAllHolders(prev => ({
      ...prev,
      tribify: holders
    }));
  }, [holders]);

  const handleTabChange = async (tabId) => {
    setActiveTab(tabId);
    if (tabId !== 'tribify') {
      // Fetch holders for the selected token
      // This is where you'd implement the actual fetching logic
      console.log(`Fetching holders for token: ${tabId}`);
    }
  };

  const getTokenName = (address) => {
    const target = targetTokens.find(t => t.address === address);
    return target ? target.name : 'Unknown Token';
  };

  const currentHolders = allHolders[activeTab] || [];

  return (
    <div className="holders-container">
      <div className="holders-tabs">
        <button 
          className={`tab ${activeTab === 'tribify' ? 'active' : ''}`}
          onClick={() => handleTabChange('tribify')}
        >
          <span className="tab-icon">🪙</span>
          <span className="tab-name">TRIBIFY</span>
          <span className="holder-count">{allHolders.tribify?.length || 0}</span>
        </button>

        {targetTokens.map((target) => (
          <button
            key={target.address}
            className={`tab ${activeTab === target.address ? 'active' : ''}`}
            onClick={() => handleTabChange(target.address)}
          >
            <span className="tab-icon">◈</span>
            <span className="tab-name">{target.name || 'Unnamed Token'}</span>
            <span className="holder-count">{allHolders[target.address]?.length || 0}</span>
          </button>
        ))}
      </div>

      <div className="holders-list">
        <div className="holder-header">
          <div className="holder-col address">Address</div>
          <div className="holder-col percent">Share</div>
          <div className="holder-col name">Name</div>
          <div className="holder-col balance">
            {activeTab === 'tribify' ? '$TRIBIFY' : getTokenName(activeTab)}
          </div>
          <div className="holder-col sol">SOL</div>
          <div className="holder-col usdc">USDC</div>
          <div className="holder-col message">Message</div>
        </div>

        {currentHolders.map((holder) => (
          <div key={holder.address} className="holder-item">
            <div className="holder-col address">
              ◈ {holder.address}
            </div>
            <div className="holder-col percent">
              {((holder.tokenBalance / 1_000_000_000) * 100).toFixed(4)}%
            </div>
            <div className="holder-col name">
              <input
                type="text"
                value={nicknames[holder.address] || ''}
                onChange={(e) => setNicknames(prev => ({
                  ...prev,
                  [holder.address]: e.target.value
                }))}
                placeholder="+ Add name"
              />
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
              <button onClick={() => onNodeClick?.(holder.address)}>
                Message
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HoldersList; 