import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { Keypair } from '@solana/web3.js';
import CryptoJS from 'crypto-js';
import '../wallet.css';

function WalletPage() {
  const navigate = useNavigate();
  const [selectedAmount, setSelectedAmount] = useState('');
  const [showBuyConfig, setShowBuyConfig] = useState(false);
  const [showSellConfig, setShowSellConfig] = useState(false);
  const [keypairs, setKeypairs] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  useEffect(() => {
    const loadStoredKeypairs = () => {
      try {
        if (!window.phantom?.solana?.publicKey) return;
        
        const encryptedData = localStorage.getItem('tribify_keypairs');
        if (!encryptedData) {
          console.log('No stored keypairs found');
          return;
        }

        console.log('Found encrypted data length:', encryptedData.length);
        console.log('First 50 chars of encrypted data:', encryptedData.substring(0, 50));

        const walletAddress = window.phantom.solana.publicKey.toString();
        console.log('Decrypting with wallet:', walletAddress);

        // Decrypt the data
        const decrypted = CryptoJS.AES.decrypt(encryptedData, walletAddress).toString(CryptoJS.enc.Utf8);
        
        const storedData = JSON.parse(decrypted);
        console.log('Successfully decrypted keypairs:', storedData.length);
        
        const loadedKeypairs = storedData.map(pair => 
          Keypair.fromSecretKey(new Uint8Array(pair.secretKey))
        );
        
        setKeypairs(loadedKeypairs);
        console.log('Loaded keypairs:', loadedKeypairs.length);
      } catch (error) {
        console.error('Failed to load stored keypairs:', error);
      }
    };

    loadStoredKeypairs();
  }, []);

  useEffect(() => {
    const storeKeypairs = () => {
      try {
        if (!window.phantom?.solana?.publicKey || keypairs.length === 0) return;

        const walletAddress = window.phantom.solana.publicKey.toString();
        console.log('Encrypting with wallet:', walletAddress);

        const storableData = keypairs.map(kp => ({
          publicKey: kp.publicKey.toString(),
          secretKey: Array.from(kp.secretKey)
        }));

        // Encrypt the data
        const encrypted = CryptoJS.AES.encrypt(
          JSON.stringify(storableData),
          walletAddress
        ).toString();

        console.log('Encrypted data length:', encrypted.length);
        console.log('First 50 chars of encrypted data:', encrypted.substring(0, 50));

        localStorage.setItem('tribify_keypairs', encrypted);
        console.log('Stored encrypted keypairs:', keypairs.length);
      } catch (error) {
        console.error('Failed to store keypairs:', error);
      }
    };

    storeKeypairs();
  }, [keypairs]);

  const generateHDWallet = async () => {
    if (keypairs.length > 0) {
      alert('Keypairs already exist! Using existing keys to prevent loss of funds.');
      return;
    }

    try {
      setGenerating(true);
      console.log('Starting key generation...');
      
      const message = 'Generate HD wallet seed';
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await window.phantom.solana.signMessage(encodedMessage, 'utf8');
      
      const seedBytes = Uint8Array.from(signature.data || signature);
      console.log('Seed bytes:', seedBytes);
      
      const newKeypairs = [];
      
      for (let i = 0; i < 100; i++) {
        try {
          const path = `m/44'/501'/${i}'/0'`;
          const derivedBytes = derivePath(path, seedBytes).key;
          const keypair = Keypair.fromSeed(derivedBytes.slice(0, 32));
          newKeypairs.push(keypair);
        } catch (err) {
          console.error(`Failed to generate keypair ${i}:`, err);
        }
      }
      
      console.log('Generated keypairs:', newKeypairs.length);
      setKeypairs(newKeypairs);

    } catch (error) {
      console.error('Failed to generate keypairs:', error);
      alert('Failed to generate keys: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const downloadKeypairs = () => {
    try {
      const pairs = keypairs.map((kp, index) => ({
        index: index + 1,
        publicKey: kp.publicKey.toString(),
        privateKey: Buffer.from(kp.secretKey).toString('hex')
      }));

      const data = JSON.stringify({
        walletAddress: window.phantom.solana.publicKey.toString(),
        timestamp: new Date().toISOString(),
        keypairs: pairs
      }, null, 2);

      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tribify-keypairs.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download keypairs:', error);
      alert('Failed to download keys: ' + error.message);
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
    <div className="wallet-fullscreen">
      <div className="wallet-content">
        <div className="wallet-header">
          <button onClick={() => navigate('/')}>← Back</button>
          <div className="wallet-actions">
            <button 
              onClick={generateHDWallet} 
              disabled={generating || keypairs.length > 0}
              className="generate-keys"
            >
              {generating ? 'Generating...' : 'Generate Keys'}
            </button>
            {keypairs.length > 0 && (
              <button onClick={downloadKeypairs} className="download-keys">
                Download Keys
              </button>
            )}
            <button onClick={() => setShowBuyConfig(true)}>Configure Buy</button>
            <button onClick={() => setShowSellConfig(true)}>Configure Sell</button>
            <button className="buy-all">Buy All</button>
            <button className="sell-all">Sell All</button>
          </div>
        </div>

        <div className="keypair-grid">
          <div className="private-keys">
            <div className="column-header">
              <h3>Private Keys</h3>
              <span className="warning">Never share these!</span>
            </div>
            {keypairs.map((keypair, i) => (
              <div key={i} className={`keypair-item ${copiedIndex === `priv-${i}` ? 'copied' : ''}`}>
                <span className="keypair-index">{i + 1}</span>
                <div className="keypair-details">
                  <code onClick={() => copyToClipboard(Buffer.from(keypair.secretKey).toString('hex'), `priv-${i}`)}>
                    {Buffer.from(keypair.secretKey).toString('hex')}
                  </code>
                </div>
                <span className="keypair-status">Copied!</span>
              </div>
            ))}
          </div>

          <div className="public-keys">
            <div className="column-header">
              <h3>Public Keys</h3>
              <div className="sub-headers">
                <span className="address-header">Address</span>
                <span className="actions-header">Actions</span>
                <span className="balances-header">Balances</span>
              </div>
            </div>
            {keypairs.map((keypair, i) => (
              <div key={i} className={`keypair-item ${copiedIndex === `pub-${i}` ? 'copied' : ''}`}>
                <span className="keypair-index">{i + 1}</span>
                <div className="keypair-details">
                  <code onClick={() => copyToClipboard(keypair.publicKey.toString(), `pub-${i}`)}>
                    {keypair.publicKey.toString()}
                  </code>
                </div>
                <span className="keypair-status">Copied!</span>
                <div className="trade-buttons">
                  <button className="buy-button">Buy</button>
                  <button className="sell-button">Sell</button>
                </div>
                <div className="balance-info">
                  <span>0.00 SOL</span>
                  <span>0 TRIBIFY</span>
                  <span>$0.00 USDC</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Buy Configuration Modal */}
        {showBuyConfig && (
          <div className="config-modal">
            <div className="config-content">
              <h3>Configure Buy</h3>
              <input 
                type="number" 
                value={selectedAmount} 
                onChange={(e) => setSelectedAmount(e.target.value)}
                placeholder="Amount in SOL"
              />
              <div className="config-actions">
                <button onClick={() => setShowBuyConfig(false)}>Cancel</button>
                <button className="confirm-button">Confirm</button>
              </div>
            </div>
          </div>
        )}

        {/* Sell Configuration Modal */}
        {showSellConfig && (
          <div className="config-modal">
            <div className="config-content">
              <h3>Configure Sell</h3>
              <input 
                type="number" 
                value={selectedAmount} 
                onChange={(e) => setSelectedAmount(e.target.value)}
                placeholder="Amount in TRIBIFY"
              />
              <div className="config-actions">
                <button onClick={() => setShowSellConfig(false)}>Cancel</button>
                <button className="confirm-button">Confirm</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WalletPage; 