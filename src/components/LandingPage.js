import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import bs58 from 'bs58';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Need this for proper buffer handling
const Buffer = require('buffer').Buffer;

// Constants
const TRIBIFY_TOKEN_MINT = "672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump";

function LandingPage() {
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState('');

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setStatus('Connecting to Phantom wallet...');

      if (!('phantom' in window)) {
        setStatus('Please install Phantom wallet first!');
        alert('Please install Phantom wallet first!');
        window.open('https://phantom.app/', '_blank');
        return;
      }

      const provider = window.phantom?.solana;

      if (!provider?.isPhantom) {
        setStatus('Please install Phantom wallet!');
        alert('Please install Phantom wallet!');
        window.open('https://phantom.app/', '_blank');
        return;
      }

      // Connect and get parent wallet
      const connectResponse = await provider.connect();
      const parentWalletKey = connectResponse.publicKey.toString();
      console.log("Parent Wallet Connected:", parentWalletKey);
      setStatus('Wallet connected! Signing message...');

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

        // Set connection state for App.js
        localStorage.setItem('isConnected', 'true');
        localStorage.setItem('publicKey', parentWalletKey);
        
        setStatus('Connection successful! Redirecting...');
        
        // Redirect to app
        navigate('/app');

      } catch (signError) {
        console.error('Signature error:', signError);
        if (signError.code === 4001) {
          setStatus('You must sign the message to generate your secure wallet!');
          alert('You must sign the message to generate your secure wallet!');
        } else {
          setStatus('Failed to sign: ' + signError.message);
          alert('Failed to sign: ' + signError.message);
        }
        await provider.disconnect();
      }

    } catch (error) {
      console.error('Connection error:', error);
      if (error.code === 4001) {
        setStatus('Please connect your wallet to continue!');
        alert('Please connect your wallet to continue!');
      } else {
        setStatus('Connection failed: ' + error.message);
        alert('Connection failed: ' + error.message);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-content">
        <h1>Welcome to Tribify</h1>
        <p>Connect your Phantom wallet to get started</p>
        
        <button 
          onClick={handleConnect} 
          className="connect-button"
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : 'Connect Phantom Wallet'}
        </button>

        {status && <p className="status-message">{status}</p>}

        <p className="security-note">
          Your wallet will be used to generate secure child wallets. 
          Each child wallet is uniquely derived from your parent wallet.
        </p>
      </div>
    </div>
  );
}

export default LandingPage;
