import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import bs58 from 'bs58';

// Need this for proper buffer handling
const Buffer = require('buffer').Buffer;

function LandingPage() {
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);

  const features = [
    {
      title: "Advanced Wallet Management",
      description: "Create and manage up to 100 subwallets with real-time balance tracking",
      icon: "💼"
    },
    {
      title: "AI-Powered Interface",
      description: "Interact with /tribify.ai for automated operations and insights",
      icon: "🤖"
    },
    {
      title: "Secure Staking",
      description: "Flexible staking options with dynamic APY based on lock duration",
      icon: "🔒"
    },
    {
      title: "Token Operations",
      description: "Strategic $TRIBIFY distribution and multi-token conversion",
      icon: "💰"
    },
    {
      title: "Encrypted Messaging",
      description: "End-to-end encrypted communication between shareholders",
      icon: "✉️"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeatureIndex((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);

      if (!('phantom' in window)) {
        alert('Please install Phantom wallet first!');
        window.open('https://phantom.app/', '_blank');
        return;
      }

      const provider = window.phantom?.solana;

      if (!provider?.isPhantom) {
        alert('Please install Phantom wallet!');
        window.open('https://phantom.app/', '_blank');
        return;
      }

      // Connect and get parent wallet
      const connectResponse = await provider.connect();
      const parentWalletKey = connectResponse.publicKey.toString();
      console.log("Parent Wallet Connected:", parentWalletKey);

      // Sign message to prove ownership AND use as seed for HD wallet
      const message = `Tribify Wallet Generation\nParent: ${parentWalletKey}\nTimestamp: ${Date.now()}`;
      
      try {
        const encodedMessage = new TextEncoder().encode(message);
        const signResponse = await provider.signMessage(encodedMessage, 'utf8');
        
        const signatureData = signResponse.signature ? signResponse.signature : signResponse;
        
        localStorage.setItem('tribify_parent_wallet', parentWalletKey);
        
        if (Buffer.isBuffer(signatureData)) {
          localStorage.setItem(`tribify_seed_${parentWalletKey}`, bs58.encode(signatureData));
        } else if (signatureData instanceof Uint8Array) {
          localStorage.setItem(`tribify_seed_${parentWalletKey}`, bs58.encode(Buffer.from(signatureData)));
        } else if (typeof signatureData === 'string') {
          localStorage.setItem(`tribify_seed_${parentWalletKey}`, signatureData);
        } else {
          throw new Error('Unexpected signature format');
        }

        navigate('/app');

      } catch (signError) {
        console.error('Signature error:', signError);
        if (signError.code === 4001) {
          alert('You must sign the message to generate your secure wallet!');
        } else {
          alert('Failed to sign: ' + signError.message);
        }
        await provider.disconnect();
      }

    } catch (error) {
      console.error('Connection error:', error);
      if (error.code === 4001) {
        alert('Please connect your wallet to continue!');
      } else {
        alert('Connection failed: ' + error.message);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-nav">
        <div className="landing-logo">/tribify.ai</div>
        <a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="phantom-link">
          Get Phantom Wallet
        </a>
      </div>

      <div className="landing-hero">
        <div className="hero-content">
          <h1>Welcome to Tribify</h1>
          <p className="hero-subtitle">The next generation of Solana token management and community engagement</p>
          
          <button 
            onClick={handleConnect} 
            className="connect-button"
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect Phantom Wallet'}
          </button>

          <p className="security-note">
            Your wallet will be used to generate secure child wallets. 
            Each child wallet is uniquely derived from your parent wallet.
          </p>
        </div>

        <div className="feature-carousel">
          <div className="feature-card" key={currentFeatureIndex}>
            <div className="feature-icon">{features[currentFeatureIndex].icon}</div>
            <h3>{features[currentFeatureIndex].title}</h3>
            <p>{features[currentFeatureIndex].description}</p>
          </div>
        </div>
      </div>

      <div className="landing-features">
        {features.map((feature, index) => (
          <div className="feature-item" key={index}>
            <div className="feature-icon">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        ))}
      </div>

      <div className="landing-stats">
        <div className="stat-item">
          <div className="stat-value">100+</div>
          <div className="stat-label">Subwallets</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">24/7</div>
          <div className="stat-label">AI Support</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">E2E</div>
          <div className="stat-label">Encryption</div>
        </div>
      </div>

      <footer className="landing-footer">
        <p>© 2024 Tribify. Built on Solana.</p>
      </footer>
    </div>
  );
}

export default LandingPage;
