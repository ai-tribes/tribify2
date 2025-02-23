import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { TribifyContext } from '../../context/TribifyContext';
import './SniperPage.css';

function SniperPage() {
  const navigate = useNavigate();
  const { publicKey, subwallets = [] } = useContext(TribifyContext);
  const [targets, setTargets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);

  return (
    <div className="sniper-page">
      <div className="page-header">
        <h2>Sniper</h2>
        <button className="close-button" onClick={() => navigate('/app')}>×</button>
      </div>

      {/* Wallet Selection */}
      <div className="wallet-section">
        <h3>Select Wallet</h3>
        <div className="wallet-info">
          {publicKey && (
            <div className="wallet-address">
              {publicKey.slice(0, 6)}...{publicKey.slice(-4)}
            </div>
          )}
        </div>
      </div>

      {/* Sniper Targets */}
      <div className="targets-section">
        <div className="section-header">
          <h3>Snipe Targets</h3>
          <button className="add-target-button" onClick={() => handleAddTarget()}>
            + Add Target
          </button>
        </div>

        <div className="targets-list">
          {targets.map(target => (
            <div key={target.id} className="target-item">
              {/* Target inputs */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SniperPage; 