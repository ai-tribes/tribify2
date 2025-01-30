import React, { useState } from 'react';
import './App.css';
import { Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

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

// Add the documentation content at the top
const DOCS_CONTENT = `
# Tribify Token Gateway

Welcome token holder! Since you have $TRIBIFY tokens, you can access this documentation.

## How Tribify Works

1. **Payment Flow**
   - User connects Phantom wallet
   - Pays 0.001 SOL
   - Receives 100 $TRIBIFY tokens

2. **Technical Implementation**
   - Frontend in React
   - Vercel serverless API
   - Solana token distribution

3. **Smart Contract Details**
   - Token: $TRIBIFY
   - Mint: 672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump
   - Treasury: DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv

## Token Uses
1. Access to documentation
2. Future governance
3. Community membership
`;

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

      // Pay 0.001 SOL with better confirmation
      setStatus('Please approve payment (0.001 SOL) to receive 100 $TRIBIFY...');
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: resp.publicKey,
          toPubkey: new PublicKey('DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv'),
          lamports: LAMPORTS_PER_SOL * 0.001
        })
      );

      const { blockhash } = await connection.getLatestBlockhash('processed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = resp.publicKey;

      const signed = await window.solana.signTransaction(transaction);
      const solSignature = await connection.sendRawTransaction(signed.serialize());
      
      // Don't wait for confirmation, just send tokens
      setStatus('Payment sent! Getting your tokens...');

      // Get tokens from backend
      const response = await fetch('/api/send-tribify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient: userPublicKey,
          amount: TRIBIFY_REWARD_AMOUNT
        })
      });

      const data = await response.json();
      setStatus('Connected! Check your wallet for tokens.');
      setIsConnected(true);
      setPublicKey(userPublicKey);
      fetchTokenHolders();  // Show updated holder list

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
              <div className="markdown-content">
                {DOCS_CONTENT.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {status && <div className="status">{status}</div>}
    </div>
  );
}

export default App; 