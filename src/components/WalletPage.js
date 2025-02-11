import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { Keypair } from '@solana/web3.js';
import CryptoJS from 'crypto-js';

function WalletPage() {
  const navigate = useNavigate();
  const [selectedAmount, setSelectedAmount] = useState('');
  const [showBuyConfig, setShowBuyConfig] = useState(false);
  const [showSellConfig, setShowSellConfig] = useState(false);
  const [keypairs, setKeypairs] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedStates, setCopiedStates] = useState({});
  const [notification, setNotification] = useState(null);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [buyConfig, setBuyConfig] = useState({
    slippage: 1.0,
    priorityFee: 0.000001,
    walletCount: 1,
    minAmount: 0.1,
    maxAmount: 1.0,
    denominatedInSol: true
  });

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

  const copyToClipboard = async (text, index, type) => {
    try {
      await navigator.clipboard.writeText(text);
      
      // Update copied state for this specific key
      setCopiedStates(prev => ({
        ...prev,
        [`${type}-${index}`]: true
      }));

      // Show notification
      setNotification(`${type === 'private' ? 'Private' : 'Public'} key copied to clipboard`);

      // Reset states after 2 seconds
      setTimeout(() => {
        setCopiedStates(prev => ({
          ...prev,
          [`${type}-${index}`]: false
        }));
        setNotification(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="wallet-fullscreen">
      {notification && (
        <div className="copy-notification">
          {notification}
        </div>
      )}
      <div className="wallet-content">
        <div className="wallet-header">
          <button onClick={() => navigate('/')}>← Back</button>
          <div className="wallet-actions">
            <button onClick={generateHDWallet} disabled={generating}>
              Generate Keys
            </button>
            <button onClick={downloadKeypairs}>Download Keys</button>
            <button onClick={() => setIsBuyModalOpen(true)}>Configure Buy</button>
            <button onClick={() => setShowSellConfig(true)}>Configure Sell</button>
            <button className="buy-all">Buy All</button>
            <button className="sell-all">Sell All</button>
          </div>
        </div>

        <div className="wallet-table">
          <div className="table-header">
            <div className="col-index">#</div>
            <div className="col-private">PRIVATE KEY</div>
            <div className="col-public">PUBLIC KEY</div>
            <div className="col-tribify">TRIBIFY BALANCE</div>
          </div>

          {keypairs.map((keypair, i) => (
            <div key={i} className="table-row">
              <div className="col-index">{i + 1}</div>
              <div 
                className={`col-private ${copiedStates[`private-${i}`] ? 'copied' : ''}`}
                onClick={() => copyToClipboard(Buffer.from(keypair.secretKey).toString('hex'), i, 'private')}
              >
                {Buffer.from(keypair.secretKey).toString('hex')}
              </div>
              <div 
                className={`col-public ${copiedStates[`public-${i}`] ? 'copied' : ''}`}
                onClick={() => copyToClipboard(keypair.publicKey.toString(), i, 'public')}
              >
                {keypair.publicKey.toString()}
              </div>
              <div className="col-tribify">0 TRIBIFY</div>
            </div>
          ))}
        </div>

        {/* Buy Configuration Modal */}
        {isBuyModalOpen && (
          <div className="dialog-overlay">
            <div className="dialog-box">
              <div className="dialog-content">
                <h3>Configure Buy Settings</h3>
                <div className="buy-form">
                  <div className="form-field">
                    <label>Number of Wallets (1-100)</label>
                    <input 
                      type="number"
                      min="1"
                      max="100"
                      value={buyConfig.walletCount}
                      onChange={(e) => setBuyConfig({
                        ...buyConfig,
                        walletCount: Math.min(100, Math.max(1, parseInt(e.target.value) || 1))
                      })}
                    />
                  </div>
                  
                  <div className="amount-range-fields">
                    <div className="form-field">
                      <label>Min Amount</label>
                      <input 
                        type="number"
                        min="0"
                        step="0.000001"
                        value={buyConfig.minAmount}
                        onChange={(e) => setBuyConfig({
                          ...buyConfig,
                          minAmount: Math.max(0, parseFloat(e.target.value) || 0)
                        })}
                      />
                    </div>
                    <div className="form-field">
                      <label>Max Amount</label>
                      <input 
                        type="number"
                        min="0"
                        step="0.000001"
                        value={buyConfig.maxAmount}
                        onChange={(e) => setBuyConfig({
                          ...buyConfig,
                          maxAmount: Math.max(buyConfig.minAmount, parseFloat(e.target.value) || 0)
                        })}
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label>Amount Type</label>
                    <div className="radio-group">
                      <label>
                        <input 
                          type="radio"
                          checked={buyConfig.denominatedInSol}
                          onChange={() => setBuyConfig({
                            ...buyConfig,
                            denominatedInSol: true
                          })}
                        /> SOL
                      </label>
                      <label>
                        <input 
                          type="radio"
                          checked={!buyConfig.denominatedInSol}
                          onChange={() => setBuyConfig({
                            ...buyConfig,
                            denominatedInSol: false
                          })}
                        /> TRIBIFY
                      </label>
                    </div>
                  </div>

                  <div className="form-field">
                    <label>Slippage (%)</label>
                    <input 
                      type="number" 
                      min="0.1"
                      max="100"
                      step="0.1"
                      value={buyConfig.slippage}
                      onChange={(e) => setBuyConfig({
                        ...buyConfig,
                        slippage: parseFloat(e.target.value)
                      })}
                    />
                  </div>
                  <div className="form-field">
                    <label>Priority Fee (SOL)</label>
                    <input 
                      type="number"
                      min="0"
                      step="0.000001"
                      value={buyConfig.priorityFee}
                      onChange={(e) => setBuyConfig({
                        ...buyConfig,
                        priorityFee: parseFloat(e.target.value)
                      })}
                    />
                  </div>
                </div>
                <div className="dialog-note">
                  Will buy random amounts between {buyConfig.minAmount} and {buyConfig.maxAmount} {buyConfig.denominatedInSol ? 'SOL' : 'TRIBIFY'} 
                  for {buyConfig.walletCount} wallet{buyConfig.walletCount > 1 ? 's' : ''}
                </div>
              </div>
              <div className="dialog-buttons">
                <button onClick={() => setIsBuyModalOpen(false)}>Cancel</button>
                <button 
                  className="save-button"
                  onClick={() => {
                    // Save configuration logic here
                    setIsBuyModalOpen(false);
                  }}
                >
                  Save Configuration
                </button>
                <button 
                  className="buy-button"
                  onClick={() => {
                    // Buy execution logic here
                    console.log('Executing buy with config:', buyConfig);
                  }}
                >
                  Buy Now
                </button>
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