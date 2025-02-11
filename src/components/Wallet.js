import React, { useState, useEffect } from 'react';
import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import CryptoJS from 'crypto-js';

const Wallet = () => {
  const [showWallet, setShowWallet] = useState(false);
  const [keyPairs, setKeyPairs] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Load and decrypt keypairs from localStorage on mount
  useEffect(() => {
    const encryptedPairs = localStorage.getItem('wallet_keypairs');
    console.log('Loading from localStorage:', encryptedPairs ? 'Found encrypted pairs' : 'No pairs found');
    if (encryptedPairs) {
      try {
        const walletAddress = window.phantom?.solana?.publicKey?.toString();
        console.log('Wallet address for decryption:', walletAddress);
        if (walletAddress) {
          const decrypted = CryptoJS.AES.decrypt(encryptedPairs, walletAddress).toString(CryptoJS.enc.Utf8);
          const pairs = JSON.parse(decrypted);
          console.log('Decrypted pairs:', pairs.length);
          setKeyPairs(pairs);
        }
      } catch (error) {
        console.error('Failed to decrypt keypairs:', error);
      }
    }
  }, []);

  const generateKeyPairs = async () => {
    try {
      setIsGenerating(true);
      console.log('Starting key generation...');
      
      const message = 'Generate HD wallet seed';
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await window.phantom.solana.signMessage(encodedMessage, 'utf8');
      
      const seedBytes = Uint8Array.from(signature.data || signature);
      console.log('Seed bytes:', seedBytes);
      
      const newKeyPairs = [];
      
      for (let i = 0; i < 100; i++) {
        try {
          const path = `m/44'/501'/${i}'/0'`;
          const derivedBytes = derivePath(path, seedBytes).key;
          const keypair = Keypair.fromSeed(derivedBytes.slice(0, 32));
          
          newKeyPairs.push({
            publicKey: keypair.publicKey.toString(),
            privateKey: Buffer.from(keypair.secretKey).toString('hex'),
            index: i + 1
          });
        } catch (err) {
          console.error(`Failed to generate keypair ${i}:`, err);
        }
      }
      
      console.log('Generated keypairs:', newKeyPairs.length);
      
      const walletAddress = window.phantom.solana.publicKey.toString();
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(newKeyPairs),
        walletAddress
      ).toString();
      
      setKeyPairs(newKeyPairs);
      localStorage.setItem('wallet_keypairs', encrypted);
      
    } catch (error) {
      console.error('Failed to generate keypairs:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadKeyPairs = () => {
    try {
      // Encrypt the keypairs for download
      const walletAddress = window.phantom.solana.publicKey.toString();
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(keyPairs),
        walletAddress
      ).toString();

      const data = JSON.stringify({
        encrypted,
        note: "This file is encrypted with your wallet address as the key"
      }, null, 2);

      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tribify-keypairs-encrypted.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download keypairs:', error);
    }
  };

  const copyToClipboard = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1000); // Reset after 1 second
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <>
      <button 
        onClick={() => setShowWallet(true)}
        className="button"
        style={{ margin: '0 5px' }}
      >
        Wallet
      </button>

      {showWallet && (
        <div className="wallet-modal">
          <div className="wallet-content">
            <div className="wallet-header">
              <h3>HD Wallet Keys</h3>
              <div className="wallet-controls">
                <button 
                  onClick={generateKeyPairs}
                  className="generate-button"
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Generating...' : 'Generate Keys'}
                </button>
                {keyPairs.length > 0 && (
                  <button 
                    onClick={downloadKeyPairs}
                    className="download-button"
                  >
                    Download Keys
                  </button>
                )}
                <button onClick={() => setShowWallet(false)}>×</button>
              </div>
            </div>
            
            <div className="keypair-container">
              {keyPairs.length > 0 ? (
                <div className="keypair-grid">
                  <div className="keypair-column private-keys">
                    <h4>Private Keys</h4>
                    {keyPairs.map((pair, index) => (
                      <div key={index} className={`keypair-item ${copiedIndex === `private-${index}` ? 'copied' : ''}`}>
                        <div className="keypair-index">#{pair.index}</div>
                        <div className="keypair-details">
                          <code onClick={() => copyToClipboard(pair.privateKey, `private-${index}`)}>
                            {pair.privateKey}
                          </code>
                        </div>
                        <div className="keypair-status">Copied!</div>
                      </div>
                    ))}
                  </div>
                  <div className="keypair-column public-keys">
                    <h4>Public Keys</h4>
                    {keyPairs.map((pair, index) => (
                      <div key={index} className={`keypair-item ${copiedIndex === `public-${index}` ? 'copied' : ''}`}>
                        <div className="keypair-index">#{pair.index}</div>
                        <div className="keypair-details">
                          <code onClick={() => copyToClipboard(pair.publicKey, `public-${index}`)}>
                            {pair.publicKey}
                          </code>
                        </div>
                        <div className="keypair-status">Copied!</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="no-keys-message">
                  Click "Generate Keys" to create 100 deterministic key pairs from your wallet's signature
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Wallet; 