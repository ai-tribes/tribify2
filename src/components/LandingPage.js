import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import bs58 from 'bs58';
import ThemeToggle from './ThemeToggle';

// Need this for proper buffer handling
const Buffer = require('buffer').Buffer;

function LandingPage() {
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    
    // Check if already logged in and redirect if necessary
    const parentWallet = localStorage.getItem('tribify_parent_wallet');
    if (parentWallet) {
      navigate('/wallet');
    }
  }, [navigate]);

  // Theme toggle function
  const toggleTheme = () => {
    const isDark = document.body.classList.contains('dark');
    if (isDark) {
      document.body.classList.remove('dark');
      document.body.classList.add('light');
      localStorage.setItem('tribify_theme', 'light');
    } else {
      document.body.classList.remove('light');
      document.body.classList.add('dark');
      localStorage.setItem('tribify_theme', 'dark');
    }
  };

  // Get current theme
  const isDark = hasMounted ? document.body.classList.contains('dark') : true;

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
        // Convert message to Uint8Array properly
        const encodedMessage = new TextEncoder().encode(message);
        const signResponse = await provider.signMessage(encodedMessage, 'utf8');
        
        // Handle the signature data properly
        const signatureData = signResponse.signature ? signResponse.signature : signResponse;
        
        // Store parent wallet info securely
        localStorage.setItem('tribify_parent_wallet', parentWalletKey);
        
        // Store the signature as seed
        if (Buffer.isBuffer(signatureData)) {
          localStorage.setItem(`tribify_seed_${parentWalletKey}`, 
            bs58.encode(signatureData));
        } else if (signatureData instanceof Uint8Array) {
          localStorage.setItem(`tribify_seed_${parentWalletKey}`, 
            bs58.encode(Buffer.from(signatureData)));
        } else if (typeof signatureData === 'string') {
          localStorage.setItem(`tribify_seed_${parentWalletKey}`, signatureData);
        } else {
          throw new Error('Unexpected signature format');
        }

        navigate('/wallet');

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
      <div className="landing-background"></div>
      <div className="theme-toggle-landing">
        <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
      </div>
      <div className="landing-content">
        <h1>Welcome to Tribify</h1>
        <p>Connect your Phantom wallet to get started with the next generation trading platform</p>
        
        <button 
          onClick={handleConnect} 
          className="connect-button"
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : 'Connect Phantom Wallet'}
        </button>

        <p className="security-note">
          Your wallet will be used to generate secure child wallets. 
          Each child wallet is uniquely derived from your parent wallet for enhanced security and flexibility.
        </p>
      </div>
    </div>
  );
}

export default LandingPage;
