import React, { useState } from 'react';
import './ConfigureBuyModal.css';

const TRIBIFY_TOKEN = {
  address: "672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump",
  name: "TRIBIFY",
  symbol: "$TRIBIFY",
  decimals: 9
};

const ConfigureBuyModal = ({
  isOpen,
  onClose,
  buyConfig,
  setBuyConfig,
  onStartBuying,
  onRandomize,
  fetchTokenInfo
}) => {
  const [customTokenInputs, setCustomTokenInputs] = useState(['', '', '', '']);
  const [customRpcUrl, setCustomRpcUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleTokenInput = async (e, index) => {
    const value = e.target.value;
    const newInputs = [...customTokenInputs];
    newInputs[index] = value;
    setCustomTokenInputs(newInputs);

    if (e.key === 'Enter' && value.trim()) {
      setIsLoading(true);
      try {
        const tokenInfo = await fetchTokenInfo(value.trim());
        if (tokenInfo) {
          const newCustomTokens = [...buyConfig.customTokens];
          newCustomTokens[index] = {
            address: value.trim(),
            ...tokenInfo
          };
          setBuyConfig(prev => ({
            ...prev,
            customTokens: newCustomTokens
          }));
        }
      } catch (error) {
        console.error('Failed to fetch token info:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="configure-buy-modal">
        <div className="modal-content">
          {/* Left Panel */}
          <div className="left-panel">
            <h3 className="guide-title">Buy Configuration Guide</h3>
            
            <div className="guide-section">
              <h4>Required Details</h4>
            </div>

            <div className="guide-section">
              <h4>Select Token to Buy</h4>
              <div className="token-display">
                <div className="token-symbol">$TRIBIFY</div>
                <div className="token-loading">Loading...</div>
                <div className="token-address">{TRIBIFY_TOKEN.address}</div>
              </div>
            </div>

            <div className="guide-section">
              <h4>Custom Tokens</h4>
              {customTokenInputs.map((input, index) => (
                <div key={index} className="token-input-container">
                  <input
                    type="text"
                    placeholder="Enter token CA"
                    value={input}
                    onChange={(e) => handleTokenInput(e, index)}
                    onKeyPress={(e) => e.key === 'Enter' && handleTokenInput(e, index)}
                  />
                </div>
              ))}
            </div>

            <div className="guide-section">
              <h4>Custom RPC URL (Optional)</h4>
              <div className="rpc-input-container">
                <input
                  type="text"
                  placeholder="Your RPC endpoint"
                  value={customRpcUrl}
                  onChange={(e) => setCustomRpcUrl(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="right-panel">
            <div className="right-header">
              <h2>Configure Automated Buying Sequence</h2>
              <div className="header-buttons">
                <button className="randomize-btn" onClick={onRandomize}>
                  🎲 Randomize
                </button>
                <button className="save-btn">
                  Save Config
                </button>
                <button className="start-btn" onClick={onStartBuying}>
                  Start Buying
                </button>
                <button className="close-btn" onClick={onClose}>×</button>
              </div>
            </div>

            <div className="settings-section">
              <h3>Wallet & Amount Settings</h3>
              <div className="settings-grid">
                <div className="setting-item">
                  <label>Number of Wallets (1-100)</label>
                  <input
                    type="number"
                    value={buyConfig.walletCount}
                    onChange={(e) => setBuyConfig(prev => ({ 
                      ...prev, 
                      walletCount: Math.min(100, Math.max(1, parseInt(e.target.value) || 1)) 
                    }))}
                    min="1"
                    max="100"
                  />
                </div>
                <div className="setting-item">
                  <label>Min Amount</label>
                  <input
                    type="number"
                    value={buyConfig.minAmount}
                    onChange={(e) => setBuyConfig(prev => ({ 
                      ...prev, 
                      minAmount: parseFloat(e.target.value) || 0.1 
                    }))}
                    min="0.1"
                    step="0.1"
                  />
                </div>
                <div className="setting-item">
                  <label>Max Amount</label>
                  <input
                    type="number"
                    value={buyConfig.maxAmount}
                    onChange={(e) => setBuyConfig(prev => ({ 
                      ...prev, 
                      maxAmount: parseFloat(e.target.value) || 1 
                    }))}
                    min="0.1"
                    step="0.1"
                  />
                </div>
              </div>
            </div>

            <div className="settings-section">
              <h3>Time Settings</h3>
              <div className="settings-grid">
                <div className="setting-item">
                  <label>Start Time</label>
                  <input
                    type="datetime-local"
                    value={buyConfig.startTime || ''}
                    onChange={(e) => setBuyConfig(prev => ({ 
                      ...prev, 
                      startTime: e.target.value 
                    }))}
                  />
                </div>
                <div className="setting-item">
                  <label>End Time</label>
                  <input
                    type="datetime-local"
                    value={buyConfig.endTime || ''}
                    onChange={(e) => setBuyConfig(prev => ({ 
                      ...prev, 
                      endTime: e.target.value 
                    }))}
                  />
                </div>
                <div className="setting-item">
                  <label>Min Interval (seconds)</label>
                  <input
                    type="number"
                    value={buyConfig.minInterval}
                    onChange={(e) => setBuyConfig(prev => ({ 
                      ...prev, 
                      minInterval: parseInt(e.target.value) || 5 
                    }))}
                    min="5"
                  />
                </div>
                <div className="setting-item">
                  <label>Max Interval (seconds)</label>
                  <input
                    type="number"
                    value={buyConfig.maxInterval}
                    onChange={(e) => setBuyConfig(prev => ({ 
                      ...prev, 
                      maxInterval: parseInt(e.target.value) || 30 
                    }))}
                    min="5"
                  />
                </div>
              </div>
            </div>

            <div className="settings-section">
              <h3>Transaction Settings</h3>
              <div className="settings-grid">
                <div className="setting-item">
                  <label>Slippage (%)</label>
                  <input
                    type="number"
                    value={buyConfig.slippage}
                    onChange={(e) => setBuyConfig(prev => ({ 
                      ...prev, 
                      slippage: parseFloat(e.target.value) || 1 
                    }))}
                    min="0.1"
                    step="0.1"
                  />
                </div>
                <div className="setting-item">
                  <label>Priority Fee (SOL)</label>
                  <input
                    type="number"
                    value={buyConfig.priorityFee}
                    onChange={(e) => setBuyConfig(prev => ({ 
                      ...prev, 
                      priorityFee: parseFloat(e.target.value) || 0.000001 
                    }))}
                    min="0.000001"
                    step="0.000001"
                  />
                </div>
                <div className="setting-item checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={buyConfig.randomOrder}
                      onChange={(e) => setBuyConfig(prev => ({ 
                        ...prev, 
                        randomOrder: e.target.checked 
                      }))}
                    />
                    Randomize Wallet Order
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigureBuyModal; 