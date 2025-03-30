import React, { useState } from 'react';
import './LandingPage.css';

const LandingPage = ({ onSocialLogin, onWalletLogin }) => {
  const [activeTab, setActiveTab] = useState('social'); // 'social' or 'wallet'

  return (
    <div className="landing-container">
      <div className="landing-header">
        <div className="logo-section">
          <h1>$Tribify.ai</h1>
          <p className="subtitle">Tribify your social media with AI-powered token management</p>
        </div>
      </div>

      <div className="landing-content">
        <div className="hero-section">
          <div className="hero-text">
            <h2>Transform Your Social Media Following Into a Token-Powered Community</h2>
            <p className="hero-description">
              $Tribify.ai connects your social media accounts, launches your personal token, and deploys an AI agent to help you grow and manage your community.
            </p>
          </div>
          <div className="hero-image">
            <div className="image-placeholder">
              <span className="ai-token-graphic">AI</span>
              <div className="token-circle"></div>
              <div className="social-connections">
                <div className="connection-line"></div>
                <div className="connection-line"></div>
                <div className="connection-line"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="login-section">
          <div className="login-tabs">
            <button 
              className={`tab-button ${activeTab === 'social' ? 'active' : ''}`}
              onClick={() => setActiveTab('social')}
            >
              Sign in with Social Media
            </button>
            <button 
              className={`tab-button ${activeTab === 'wallet' ? 'active' : ''}`}
              onClick={() => setActiveTab('wallet')}
            >
              Connect Wallet
            </button>
          </div>

          <div className="login-content">
            {activeTab === 'social' ? (
              <div className="social-login-options">
                <button 
                  className="social-button google"
                  onClick={() => onSocialLogin && onSocialLogin('google')}
                >
                  <i className="social-icon">G</i>
                  Continue with Google
                </button>
                <button 
                  className="social-button facebook"
                  onClick={() => onSocialLogin && onSocialLogin('facebook')}
                >
                  <i className="social-icon">f</i>
                  Continue with Facebook
                </button>
                <button 
                  className="social-button twitter"
                  onClick={() => onSocialLogin && onSocialLogin('twitter')}
                >
                  <i className="social-icon">𝕏</i>
                  Continue with Twitter
                </button>
                <button 
                  className="social-button instagram"
                  onClick={() => onSocialLogin && onSocialLogin('instagram')}
                >
                  <i className="social-icon">IG</i>
                  Continue with Instagram
                </button>
                <button 
                  className="social-button tiktok"
                  onClick={() => onSocialLogin && onSocialLogin('tiktok')}
                >
                  <i className="social-icon">TT</i>
                  Continue with TikTok
                </button>
              </div>
            ) : (
              <div className="wallet-login-options">
                <button 
                  className="wallet-button phantom"
                  onClick={() => onWalletLogin && onWalletLogin('phantom')}
                >
                  <i className="wallet-icon">P</i>
                  Connect with Phantom
                </button>
                <button 
                  className="wallet-button metamask"
                  onClick={() => onWalletLogin && onWalletLogin('metamask')}
                >
                  <i className="wallet-icon">M</i>
                  Connect with Metamask
                </button>
                <button 
                  className="wallet-button xverse"
                  onClick={() => onWalletLogin && onWalletLogin('xverse')}
                >
                  <i className="wallet-icon">X</i>
                  Connect with Xverse
                </button>
                <button 
                  className="wallet-button coinbase"
                  onClick={() => onWalletLogin && onWalletLogin('coinbase')}
                >
                  <i className="wallet-icon">C</i>
                  Connect with Coinbase
                </button>
                <button 
                  className="wallet-button handcash"
                  onClick={() => onWalletLogin && onWalletLogin('handcash')}
                >
                  <i className="wallet-icon">HC</i>
                  Connect with HandCash
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="features-section">
          <h3 className="section-title">How Tribify Works</h3>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon connect-icon">🔗</div>
              <h3>Connect</h3>
              <p>Link your social media accounts to establish your digital identity and audience reach</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon token-icon">🪙</div>
              <h3>Launch Token</h3>
              <p>Create your personal token with just a few clicks and define your tokenomics</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon ai-icon">🤖</div>
              <h3>AI Management</h3>
              <p>Your personal AI agent helps manage your token, community, and growth strategy</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon community-icon">👥</div>
              <h3>Build Community</h3>
              <p>Engage with token holders, distribute rewards, and grow your tribe</p>
            </div>
          </div>
        </div>

        <div className="how-it-works">
          <h3 className="section-title">What is Tribify?</h3>
          <div className="tribify-explanation">
            <p>
              <strong>$Tribify</strong> is a platform that transforms your social media following into a token-powered community. By "tribifying" your social media accounts, you can:
            </p>
            <ul className="tribify-benefits">
              <li>Launch your own token that represents value in your community</li>
              <li>Manage up to 100 subwallets for strategic token distribution</li>
              <li>Get an AI agent that helps you optimize your token strategy</li>
              <li>Create governance structures for community decision-making</li>
              <li>Build deeper connections with your most engaged followers</li>
            </ul>
            <p className="cta-text">
              Ready to tribify your online presence? Sign up today and transform your followers into a thriving community!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
