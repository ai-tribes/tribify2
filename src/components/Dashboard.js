import React from 'react';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>$Tribify Dashboard</h1>
        <p className="welcome-text">Welcome to your personal token management dashboard</p>
      </div>
      
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">👤</div>
          <h3>Tribe Members</h3>
          <p className="stat-value">0</p>
          <p className="stat-description">People holding your token</p>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <h3>Total Supply</h3>
          <p className="stat-value">1,000,000</p>
          <p className="stat-description">Total token supply</p>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <h3>Active Targets</h3>
          <p className="stat-value">0</p>
          <p className="stat-description">Token acquisition targets</p>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🗳️</div>
          <h3>Active Votes</h3>
          <p className="stat-value">0</p>
          <p className="stat-description">Governance proposals</p>
        </div>
      </div>
      
      <div className="dashboard-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button className="action-button ai-action">
            <span className="action-icon">🤖</span>
            <span className="action-text">Launch Token</span>
          </button>
          
          <button className="action-button wallet-action">
            <span className="action-icon">👛</span>
            <span className="action-text">Manage Wallets</span>
          </button>
          
          <button className="action-button target-action">
            <span className="action-icon">🎯</span>
            <span className="action-text">Set Target</span>
          </button>
          
          <button className="action-button vote-action">
            <span className="action-icon">✋</span>
            <span className="action-text">Create Vote</span>
          </button>
        </div>
      </div>
      
      <div className="dashboard-recent">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          <div className="activity-empty">
            <p>No recent activity to display</p>
            <p className="activity-hint">Your token activities will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 