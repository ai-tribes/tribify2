import React from 'react';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-container">
      <div className="landing-header">
        <div className="logo-section">
          <h1>/tribify.ai</h1>
          <p className="subtitle">AI-powered token management & community platform</p>
        </div>
      </div>

      <div className="landing-content">
        <div className="features-grid">
          <div className="feature-card">
            <h3>Token Management</h3>
            <p>Create and manage up to 100 subwallets for strategic token distribution</p>
          </div>
          <div className="feature-card">
            <h3>Community Tools</h3>
            <p>Monitor token holders, communicate with shareholders, and build your community</p>
          </div>
          <div className="feature-card">
            <h3>Token Conversion</h3>
            <p>Seamlessly convert between TRIBIFY, SOL, and USDC tokens</p>
          </div>
          <div className="feature-card">
            <h3>AI Assistant</h3>
            <p>Get help with wallet management, token strategies, and community engagement</p>
          </div>
        </div>

        <div className="terminal-section">
          <div className="terminal-header">
            <span className="terminal-title">AI Terminal</span>
            <button className="close-terminal">×</button>
          </div>
          <div className="terminal-content">
            <div className="welcome-message">
              Welcome to /tribify.ai! I'm your AI assistant for managing TRIBIFY tokens and wallets. I can help you:
              • Create and manage up to 100 subwallets
              • Distribute TRIBIFY tokens strategically
              • Convert between TRIBIFY, SOL, and USDC
              • Monitor your token holder community
            </div>
            <div className="terminal-input-container">
              <input
                type="text"
                className="terminal-input"
                placeholder="Enter a command or ask for help..."
              />
            </div>
            <div className="terminal-output">
              Type /help to see all commands
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
