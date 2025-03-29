import React, { useState, useRef, useContext } from 'react';
import { TribifyContext } from '../context/TribifyContext';
import './Sign.css';

function Sign() {
  const { publicKeys } = useContext(TribifyContext);
  const [activeTab, setActiveTab] = useState('passport');
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileHash, setFileHash] = useState('');
  const [doubleHash, setDoubleHash] = useState('');
  const [signature, setSignature] = useState('');
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [documents, setDocuments] = useState([]);
  const [proposals, setProposals] = useState([]);

  // Load proposals from localStorage
  React.useEffect(() => {
    const savedProposals = localStorage.getItem('tribify_proposals');
    if (savedProposals) {
      setProposals(JSON.parse(savedProposals));
    }
  }, []);

  const calculateHash = async (file) => {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (error) {
      console.error('Error calculating hash:', error);
      return null;
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setStatus('Calculating hash...');

    try {
      // Calculate first hash
      const hash = await calculateHash(file);
      setFileHash(hash);

      // Calculate hash of the hash
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(hash));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const doubleHashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setDoubleHash(doubleHashHex);

      setStatus('Ready to sign');
    } catch (error) {
      console.error('Error processing file:', error);
      setStatus('Error processing file');
    }
  };

  const signHash = async () => {
    if (!doubleHash) return;

    try {
      setStatus('Requesting signature...');
      const message = new TextEncoder().encode(doubleHash);
      const signedMessage = await window.phantom.solana.signMessage(message, 'utf8');
      setSignature(signedMessage.signature);
      setStatus('Successfully signed');

      // For passport verification, store the verification
      if (activeTab === 'passport') {
        const verification = {
          timestamp: Date.now(),
          fileHash,
          doubleHash,
          signature: signedMessage.signature,
          wallet: window.phantom.solana.publicKey.toString()
        };
        localStorage.setItem('passport_verification', JSON.stringify(verification));
      }

      // For documents, add to documents list
      if (activeTab === 'documents') {
        const newDocument = {
          name: selectedFile.name,
          timestamp: Date.now(),
          hash: fileHash,
          doubleHash,
          signature: signedMessage.signature,
          wallet: window.phantom.solana.publicKey.toString()
        };
        setDocuments([...documents, newDocument]);
        localStorage.setItem('signed_documents', JSON.stringify([...documents, newDocument]));
      }
    } catch (error) {
      console.error('Error signing:', error);
      setStatus('Error signing: ' + error.message);
    }
  };

  const signMessage = async () => {
    if (!message) return;

    try {
      setStatus('Requesting signature...');
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await window.phantom.solana.signMessage(encodedMessage, 'utf8');
      setSignature(signedMessage.signature);
      setStatus('Successfully signed message');
    } catch (error) {
      console.error('Error signing message:', error);
      setStatus('Error signing message: ' + error.message);
    }
  };

  const signProposal = async (proposal) => {
    try {
      setStatus('Signing proposal...');
      const message = JSON.stringify({
        type: 'proposal',
        id: proposal.id,
        title: proposal.title,
        timestamp: Date.now()
      });

      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await window.phantom.solana.signMessage(encodedMessage, 'utf8');

      // Update proposal with signature
      const updatedProposals = proposals.map(p => {
        if (p.id === proposal.id) {
          return {
            ...p,
            signatures: [...(p.signatures || []), {
              wallet: window.phantom.solana.publicKey.toString(),
              signature: signedMessage.signature,
              timestamp: Date.now()
            }]
          };
        }
        return p;
      });

      setProposals(updatedProposals);
      localStorage.setItem('tribify_proposals', JSON.stringify(updatedProposals));
      setStatus('Successfully signed proposal');
    } catch (error) {
      console.error('Error signing proposal:', error);
      setStatus('Error signing proposal: ' + error.message);
    }
  };

  return (
    <div className="sign-container">
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'passport' ? 'active' : ''}`}
          onClick={() => setActiveTab('passport')}
        >
          Passport Verification
        </button>
        <button 
          className={`tab ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          Document Signing
        </button>
        <button 
          className={`tab ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          Message Signing
        </button>
        <button 
          className={`tab ${activeTab === 'proposals' ? 'active' : ''}`}
          onClick={() => setActiveTab('proposals')}
        >
          Proposal Signing
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'passport' && (
          <div className="passport-section">
            <h2>Passport Verification</h2>
            <p className="help-text">
              Upload your passport to create a secure hash that will be used for verification.
              Your passport file never leaves your device - only the hash is stored.
            </p>
            
            <div className="upload-section">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="file-input"
              />
            </div>

            {fileHash && (
              <div className="hash-display">
                <h3>File Hash:</h3>
                <code>{fileHash}</code>
                <h3>Double Hash:</h3>
                <code>{doubleHash}</code>
              </div>
            )}

            {doubleHash && (
              <div className="sign-section">
                <button onClick={signHash} className="sign-button">
                  Sign Hash
                </button>
              </div>
            )}

            {signature && (
              <div className="signature-display">
                <h3>Signature:</h3>
                <code>{signature}</code>
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="documents-section">
            <h2>Document Signing</h2>
            <p className="help-text">
              Upload any document to sign it with your wallet.
              The document's hash and your signature will be stored for verification.
            </p>

            <div className="upload-section">
              <input
                type="file"
                onChange={handleFileSelect}
                className="file-input"
              />
            </div>

            {fileHash && (
              <div className="hash-display">
                <h3>Document Hash:</h3>
                <code>{fileHash}</code>
              </div>
            )}

            {doubleHash && (
              <div className="sign-section">
                <button onClick={signHash} className="sign-button">
                  Sign Document
                </button>
              </div>
            )}

            <div className="documents-list">
              <h3>Signed Documents</h3>
              {documents.map((doc, index) => (
                <div key={index} className="document-item">
                  <span className="document-name">{doc.name}</span>
                  <span className="document-date">
                    {new Date(doc.timestamp).toLocaleString()}
                  </span>
                  <code className="document-signature">{doc.signature.slice(0, 20)}...</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="messages-section">
            <h2>Message Signing</h2>
            <p className="help-text">
              Sign any message with your wallet to prove ownership.
            </p>

            <div className="message-input">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter message to sign"
              />
            </div>

            <div className="sign-section">
              <button 
                onClick={signMessage} 
                className="sign-button"
                disabled={!message}
              >
                Sign Message
              </button>
            </div>

            {signature && (
              <div className="signature-display">
                <h3>Signature:</h3>
                <code>{signature}</code>
              </div>
            )}
          </div>
        )}

        {activeTab === 'proposals' && (
          <div className="proposals-section">
            <h2>Proposal Signing</h2>
            <p className="help-text">
              Sign proposals to show your support or approval.
            </p>

            <div className="proposals-list">
              {proposals.map((proposal) => (
                <div key={proposal.id} className="proposal-item">
                  <h3>{proposal.title}</h3>
                  <p>{proposal.description}</p>
                  <div className="signatures-count">
                    Signatures: {(proposal.signatures || []).length}
                  </div>
                  <button 
                    onClick={() => signProposal(proposal)}
                    className="sign-button"
                    disabled={proposal.signatures?.some(
                      s => s.wallet === window.phantom.solana.publicKey?.toString()
                    )}
                  >
                    {proposal.signatures?.some(
                      s => s.wallet === window.phantom.solana.publicKey?.toString()
                    ) ? 'Already Signed' : 'Sign Proposal'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {status && (
        <div className="status-message">
          {status}
        </div>
      )}
    </div>
  );
}

export default Sign; 