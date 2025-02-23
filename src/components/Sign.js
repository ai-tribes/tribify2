import React, { useState } from 'react';
import './Sign.css';
import { useAuth } from '../context/AuthContext';

const Sign = () => {
  const auth = useAuth();
  // Let's log the auth object to see what we're getting
  console.log('Auth context:', auth);
  
  // Check if we have a connected wallet
  const isWalletConnected = auth?.isConnected || auth?.address || auth?.wallet;
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileHash, setFileHash] = useState('');
  const [signature, setSignature] = useState('');
  const [status, setStatus] = useState('');

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    // Reset states when new file is selected
    setFileHash('');
    setSignature('');
    setStatus('');
  };

  const calculateHash = async (file) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleSign = async () => {
    if (!selectedFile) {
      setStatus('Please select a file first');
      return;
    }

    try {
      setStatus('Calculating file hash...');
      const hash = await calculateHash(selectedFile);
      setFileHash(hash);
      
      // Only attempt to sign if we have a wallet
      if (isWalletConnected) {
        try {
          setStatus('Signing hash with your private key...');
          const message = `Sign this document hash: ${hash}`;
          const signature = await auth.wallet.signMessage(message);
          setSignature(signature);
          setStatus('Document signed successfully');
        } catch (signError) {
          console.error('Error signing message:', signError);
          setStatus('Error signing the document. Please try again.');
        }
      } else {
        setStatus('Please connect your wallet to sign the document');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setStatus('Error processing file');
    }
  };

  return (
    <div className="sign-container">
      <h2>Sign Document</h2>
      
      {!isWalletConnected && (
        <div className="status-message warning">
          Please connect your wallet to enable document signing
        </div>
      )}
      
      <div className="upload-section">
        <input
          type="file"
          onChange={handleFileSelect}
          className="file-input"
        />
        <p className="help-text">Select a file to calculate its hash and sign</p>
      </div>

      {fileHash && (
        <div className="hash-display">
          <h3>File Hash:</h3>
          <code>{fileHash}</code>
        </div>
      )}

      {signature && (
        <div className="hash-display">
          <h3>Digital Signature:</h3>
          <code>{signature}</code>
        </div>
      )}

      <div className="encrypted-section">
        <button 
          onClick={handleSign}
          disabled={!selectedFile}
        >
          {!fileHash ? 'Calculate Hash' : 'Sign Document'}
        </button>
      </div>

      {status && (
        <div className="status-message">
          {status}
        </div>
      )}
    </div>
  );
};

export default Sign; 