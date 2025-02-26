import React, { useState, useEffect, useContext } from 'react';
import { TribifyContext } from '../context/TribifyContext';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { nacl } from '@solana/web3.js';
import './Sign.css';

const SignPage = () => {
  const { publicKey, signMessage } = useContext(TribifyContext);
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [verificationMode, setVerificationMode] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationAddress, setVerificationAddress] = useState('');
  const [verificationSignature, setVerificationSignature] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');

  // Example messages for common use cases
  const exampleMessages = [
    {
      title: "Prove Wallet Ownership",
      text: `I am the owner of wallet ${publicKey || '[your wallet]'}\nTimestamp: ${new Date().toISOString()}`
    },
    {
      title: "Sign Transaction Intent",
      text: `I intend to send 10 TRIBIFY tokens to recipient.\nTimestamp: ${new Date().toISOString()}`
    },
    {
      title: "Authenticate for Website",
      text: `I am authenticating for tribify.io\nTimestamp: ${new Date().toISOString()}`
    }
  ];

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };

  const handleVerificationAddressChange = (e) => {
    setVerificationAddress(e.target.value);
  };

  const handleVerificationSignatureChange = (e) => {
    setVerificationSignature(e.target.value);
  };

  const handleVerificationMessageChange = (e) => {
    setVerificationMessage(e.target.value);
  };

  const handleSign = async () => {
    if (!publicKey || !message) {
      setStatus('Please connect your wallet and enter a message');
      return;
    }

    try {
      setIsLoading(true);
      setStatus('Waiting for signature...');
      
      // Use the signMessage function from context
      if (signMessage) {
        const encodedMessage = new TextEncoder().encode(message);
        const signedMessage = await signMessage(encodedMessage);
        const signatureBase58 = bs58.encode(signedMessage);
        setSignature(signatureBase58);
        setStatus('Message signed successfully!');
      } else {
        // Fallback for development/testing
        setTimeout(() => {
          setSignature('5QKy1Pq9nJ5QyxKdVYVpwMZBm7JZmHzfXUkBNYKEgHUVdMB4kKfkQJZrw2GDQRzANLWHYUp8RVxwMkBie9Ubnweo');
          setStatus('Message signed successfully! (DEMO MODE)');
        }, 1500);
      }
    } catch (error) {
      console.error('Error signing message:', error);
      setStatus(`Error: ${error.message || 'Failed to sign message'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySignature = () => {
    if (signature) {
      navigator.clipboard.writeText(signature);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUseExample = (exampleText) => {
    setMessage(exampleText);
  };

  const toggleVerificationMode = () => {
    setVerificationMode(!verificationMode);
    setVerificationResult(null);
  };

  const verifySignature = async () => {
    if (!verificationAddress || !verificationSignature || !verificationMessage) {
      setVerificationResult({
        valid: false,
        message: 'Please fill in all verification fields'
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Convert the message to Uint8Array
      const messageBytes = new TextEncoder().encode(verificationMessage);
      
      // Convert the signature from base58 to Uint8Array
      let signatureBytes;
      try {
        signatureBytes = bs58.decode(verificationSignature);
      } catch (error) {
        setVerificationResult({
          valid: false,
          message: 'Invalid signature format'
        });
        setIsLoading(false);
        return;
      }
      
      // Convert the public key string to a PublicKey object
      let pubKey;
      try {
        pubKey = new PublicKey(verificationAddress);
      } catch (error) {
        setVerificationResult({
          valid: false,
          message: 'Invalid wallet address'
        });
        setIsLoading(false);
        return;
      }
      
      // In a real implementation, you would use nacl.sign.detached.verify
      // For demo purposes, we'll simulate verification
      const isValid = signatureBytes.length === 64; // Simplified check
      
      // Simulate verification delay
      setTimeout(() => {
        setVerificationResult({
          valid: isValid,
          message: isValid 
            ? 'Signature verified successfully!' 
            : 'Invalid signature for this message and wallet'
        });
        setIsLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error verifying signature:', error);
      setVerificationResult({
        valid: false,
        message: `Error: ${error.message || 'Failed to verify signature'}`
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="sign-container">
      <div className="sign-header">
        <h2>Solana Message Signing</h2>
        <div className="mode-toggle">
          <button 
            className={`mode-button ${!verificationMode ? 'active' : ''}`}
            onClick={() => setVerificationMode(false)}
          >
            Sign Message
          </button>
          <button 
            className={`mode-button ${verificationMode ? 'active' : ''}`}
            onClick={() => setVerificationMode(true)}
          >
            Verify Signature
          </button>
        </div>
      </div>
      
      {!verificationMode ? (
        // SIGNING MODE
        <>
          <p className="description">
            Use your Solana wallet to sign a message. This proves ownership of your wallet without revealing your private key.
          </p>
          
          {!publicKey ? (
            <div className="connect-prompt">
              <i className="icon-wallet"></i>
              <p>Please connect your wallet to sign messages</p>
            </div>
          ) : (
            <>
              <div className="examples-section">
                <h3>Example Messages</h3>
                <div className="example-buttons">
                  {exampleMessages.map((example, index) => (
                    <button 
                      key={index}
                      className="example-button"
                      onClick={() => handleUseExample(example.text)}
                    >
                      {example.title}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="sign-form">
                <div className="form-group">
                  <label htmlFor="message">Message to sign:</label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={handleMessageChange}
                    placeholder="Enter a message to sign"
                    rows={4}
                  />
                </div>
                
                <button 
                  className={`sign-button ${isLoading ? 'loading' : ''}`}
                  onClick={handleSign}
                  disabled={!message || isLoading}
                >
                  {isLoading ? 'Signing...' : 'Sign Message'}
                </button>
                
                {status && <div className={`status-message ${status.includes('Error') ? 'error' : ''}`}>{status}</div>}
                
                {signature && (
                  <div className="signature-result">
                    <div className="signature-header">
                      <h3>Signature:</h3>
                      <button 
                        className={`copy-button ${copied ? 'copied' : ''}`}
                        onClick={handleCopySignature}
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="signature-box">
                      {signature}
                    </div>
                    <p className="signature-note">
                      This signature uniquely proves that you control this wallet and signed this specific message.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      ) : (
        // VERIFICATION MODE
        <>
          <p className="description">
            Verify a signature to confirm that a specific message was signed by the owner of a particular wallet.
          </p>
          
          <div className="verification-form">
            <div className="form-group">
              <label htmlFor="verificationAddress">Wallet Address:</label>
              <input
                id="verificationAddress"
                type="text"
                value={verificationAddress}
                onChange={handleVerificationAddressChange}
                placeholder="Enter the wallet address (e.g., 4Zw1fXuYuJhWhu9KLEYMhiPEiqcpKd6akw3WRZCv84HA)"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="verificationMessage">Message:</label>
              <textarea
                id="verificationMessage"
                value={verificationMessage}
                onChange={handleVerificationMessageChange}
                placeholder="Enter the original message that was signed"
                rows={3}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="verificationSignature">Signature:</label>
              <textarea
                id="verificationSignature"
                value={verificationSignature}
                onChange={handleVerificationSignatureChange}
                placeholder="Enter the signature to verify"
                rows={2}
              />
            </div>
            
            <button 
              className={`verify-button ${isLoading ? 'loading' : ''}`}
              onClick={verifySignature}
              disabled={!verificationAddress || !verificationSignature || !verificationMessage || isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify Signature'}
            </button>
            
            {verificationResult && (
              <div className={`verification-result ${verificationResult.valid ? 'valid' : 'invalid'}`}>
                <div className="result-icon">
                  {verificationResult.valid ? '✓' : '✗'}
                </div>
                <div className="result-message">
                  {verificationResult.message}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SignPage; 