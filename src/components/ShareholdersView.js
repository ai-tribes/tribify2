import React, { useState, useEffect } from 'react';
import './ShareholdersView.css';
import HoldersList from './HoldersList';

function ShareholdersView() {
  const [activeTab, setActiveTab] = useState('tribify');
  const [targetTokens, setTargetTokens] = useState([]);
  const [holders, setHolders] = useState({
    tribify: [], // TRIBIFY holders
    // Other token holders will be added dynamically
  });
  const [nicknames, setNicknames] = useState({});

  useEffect(() => {
    // Load target tokens from localStorage (synced with Sniper)
    const savedTargets = localStorage.getItem('sniper_targets');
    if (savedTargets) {
      const targets = JSON.parse(savedTargets);
      setTargetTokens(targets.filter(t => t.isActive));
      
      // Initialize holders state for each target
      const newHolders = { tribify: holders.tribify };
      targets.forEach(target => {
        if (target.isActive) {
          newHolders[target.address] = [];
        }
      });
      setHolders(newHolders);
    }
  }, []);

  // Function to fetch holders for a specific token
  const fetchHolders = async (tokenAddress) => {
    try {
      // Implement token holder fetching logic here
      // This is a placeholder for demonstration
      console.log(`Fetching holders for token: ${tokenAddress}`);
    } catch (error) {
      console.error(`Error fetching holders for ${tokenAddress}:`, error);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId !== 'tribify') {
      fetchHolders(tabId);
    }
  };

  const getTokenName = (address) => {
    const target = targetTokens.find(t => t.address === address);
    return target ? target.name : 'Unknown Token';
  };

  return (
    <div className="shareholders-view">
      <div className="tabs-container">
        <div className="tabs-header">
          <button 
            className={`tab-button ${activeTab === 'tribify' ? 'active' : ''}`}
            onClick={() => handleTabChange('tribify')}
          >
            <div className="tab-content">
              <span className="tab-icon">🪙</span>
              <span className="tab-text">TRIBIFY</span>
              <span className="holder-count">{holders.tribify?.length || 0}</span>
            </div>
          </button>

          {targetTokens.map((target) => (
            <button
              key={target.address}
              className={`tab-button ${activeTab === target.address ? 'active' : ''}`}
              onClick={() => handleTabChange(target.address)}
            >
              <div className="tab-content">
                <span className="tab-icon">◈</span>
                <span className="tab-text">{target.name || 'Unnamed Token'}</span>
                <span className="holder-count">{holders[target.address]?.length || 0}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="tab-panel">
          {activeTab === 'tribify' ? (
            <div className="token-info tribify">
              <div className="token-header">
                <h2>TRIBIFY Holders</h2>
                <div className="token-stats">
                  <div className="stat">
                    <span className="label">Total Holders:</span>
                    <span className="value">{holders.tribify?.length || 0}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Total Supply:</span>
                    <span className="value">1,000,000,000 TRIBIFY</span>
                  </div>
                </div>
              </div>
              <HoldersList 
                holders={holders.tribify} 
                nicknames={nicknames}
                setNicknames={setNicknames}
                tokenSymbol="TRIBIFY"
              />
            </div>
          ) : (
            <div className="token-info target">
              <div className="token-header">
                <h2>{getTokenName(activeTab)} Holders</h2>
                <div className="token-stats">
                  <div className="stat">
                    <span className="label">Total Holders:</span>
                    <span className="value">{holders[activeTab]?.length || 0}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Contract:</span>
                    <span className="value contract-address">{activeTab}</span>
                  </div>
                </div>
              </div>
              <HoldersList 
                holders={holders[activeTab] || []} 
                nicknames={nicknames}
                setNicknames={setNicknames}
                tokenSymbol={getTokenName(activeTab)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShareholdersView; 