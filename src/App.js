import React, { useState } from 'react';
import './App.css';
import { Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import TokenGateway from './components/TokenGateway';

// Need this shit for Solana
window.Buffer = window.Buffer || require('buffer').Buffer;

// Add at the top with other constants
const TRIBIFY_TOKEN_MINT = "672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump";

// Update the connection cost constant
const TRIBIFY_REWARD_AMOUNT = 100; // 100 $TRIBIFY tokens reward

// Use paid Helius RPC endpoint
const connection = new Connection(
  `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
  {
    commitment: 'confirmed',
    wsEndpoint: undefined,
    confirmTransactionInitialTimeout: 60000
  }
);

// Debug logs at the very top
console.log('=== INITIAL LOAD ===');
console.log('window:', window);
console.log('window.phantom:', window.phantom);
console.log('window.solana:', window.solana);

function App() {
  // Core states only
  const [status, setStatus] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [balance, setBalance] = useState(null);
  const [tokenHolders, setTokenHolders] = useState([]);
  const [isDark, setIsDark] = useState(true);  // Keep dark mode
  const [showDocs, setShowDocs] = useState(false);

  // Core functions
  const handleConnection = async () => {
    try {
      setStatus('Connecting...');
      
      // Just try window.solana directly - no fancy shit
      if (!window.solana) {
        setStatus('Please open in Phantom wallet');
        return;
      }

      const resp = await window.solana.connect();
      const userPublicKey = resp.publicKey.toString();

      // Skip payment if treasury wallet
      if (userPublicKey === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv') {
        setIsConnected(true);
        setPublicKey(userPublicKey);
        setStatus('Treasury wallet connected!');
        await updateBalance(userPublicKey);
        fetchTokenHolders();
        return;
      }

      // Everyone else pays...

      // Pay 0.001 SOL
      setStatus('Please approve payment (0.001 SOL) to receive 100 $TRIBIFY...');
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: resp.publicKey,
          toPubkey: new PublicKey('DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv'),
          lamports: LAMPORTS_PER_SOL * 0.001
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = resp.publicKey;

      const signed = await window.solana.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature);

      // Get tokens from backend - update to use send-tribify
      let retries = 3;
      while (retries > 0) {
        try {
          setStatus(`Payment received! Getting your tokens (attempt ${4-retries}/3)...`);
          const response = await fetch('/api/send-tribify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              recipient: userPublicKey,
              amount: TRIBIFY_REWARD_AMOUNT
            })
          });

          // Add this debug logging
          console.log('API Response:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries([...response.headers])
          });

          const text = await response.text();
          console.log('Raw response:', text);

          if (!response.ok) {
            throw new Error(`API error (${response.status}): ${text || 'No error message provided'}`);
          }

          if (!text) {
            throw new Error('API returned empty response');
          }

          const data = JSON.parse(text);
          const { signature: tokenSignature } = data;
          await connection.confirmTransaction(tokenSignature);
          break; // Success, exit loop
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setIsConnected(true);
      setPublicKey(userPublicKey);
      setStatus('Connected! You received 100 TRIBIFY tokens.');
      fetchTokenHolders();

    } catch (error) {
      console.error('Connection error:', error);
      setStatus('Error: ' + error.message);
    }
  };

  const fetchTokenHolders = async () => {
    try {
      const mintPubkey = new PublicKey(TRIBIFY_TOKEN_MINT);
      const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey);
      
      const holders = await Promise.all(
        largestAccounts.value.map(async (account) => {
          const accountInfo = await connection.getParsedAccountInfo(account.address);
          return {
            address: accountInfo.value.data.parsed.info.owner,
            tokenBalance: account.amount / Math.pow(10, 9)
          };
        })
      );

      setTokenHolders(holders.filter(h => h.tokenBalance > 0));
    } catch (error) {
      console.error('Failed to fetch holders:', error);
    }
  };

  // Add function to get SOL balance
  const updateBalance = async (pubKey) => {
    try {
      const bal = await connection.getBalance(new PublicKey(pubKey));
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Balance error:', error);
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/docs/tokengateway" element={<TokenGateway />} />
        <Route path="/" element={
          <div className={`App ${isDark ? 'dark' : 'light'}`}>
            <button className="mode-toggle" onClick={() => setIsDark(!isDark)}>
              {isDark ? '◯' : '●'}
            </button>

            <button onClick={handleConnection}>
              {isConnected ? 'Connected' : 'Connect Wallet'}
            </button>

            {isConnected && (
              <>
                <div className="wallet-info">
                  <div>◈ {publicKey}</div>
                  <div>◇ {balance} SOL</div>
                </div>

                <div className="token-holders">
                  <h3>TRIBIFY Holders</h3>
                  {tokenHolders.map((holder, i) => (
                    <div key={i} className="holder-item">
                      <div>◈ {holder.address}</div>
                      <div>◇ {holder.tokenBalance} $TRIBIFY</div>
                    </div>
                  ))}
                </div>

                {!showDocs ? (
                  <button onClick={() => setShowDocs(true)} className="docs-link">
                    View Documentation
                  </button>
                ) : (
                  <div className="docs-content">
                    <button onClick={() => setShowDocs(false)}>← Back</button>
                    <h1>Tribify Documentation</h1>
                    <p>Welcome token holder! Since you have $TRIBIFY tokens, you can access this documentation.</p>
                    {/* Add more documentation content here */}
                  </div>
                )}
              </>
            )}

            {status && <div className="status">{status}</div>}
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App; 