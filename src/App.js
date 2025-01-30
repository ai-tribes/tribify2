import React, { useState } from 'react';
import './App.css';
import { Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Need this shit for Solana
window.Buffer = window.Buffer || require('buffer').Buffer;

function App() {
  const [isDark, setIsDark] = useState(true);
  const [status, setStatus] = useState('');

  // Add this check early
  if (!process.env.REACT_APP_HELIUS_KEY) {
    console.error("Missing Helius API key!");
    return <div>Configuration Error: Missing API Key</div>;
  }

  const handleClick = async () => {
    if (!window.solana) {
      alert("Get Phantom wallet!");
      return;
    }

    try {
      setStatus('Connecting...');
      const response = await window.solana.connect();
      setStatus('Connected: ' + response.publicKey.toString().slice(0,4) + '...');

      // QuickNode endpoint - they have a free tier
      const connection = new Connection(
        `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
        'confirmed'
      );

      setStatus('Creating transaction...');
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: response.publicKey,
          toPubkey: response.publicKey,
          lamports: LAMPORTS_PER_SOL * 0.001
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = response.publicKey;

      setStatus('Please sign...');
      const signed = await window.solana.signTransaction(transaction);
      
      setStatus('Sending...');
      const signature = await connection.sendRawTransaction(signed.serialize());
      
      setStatus('Confirming...');
      await connection.confirmTransaction(signature);
      setStatus('Transaction confirmed! 🎉');

    } catch (error) {
      console.error(error);
      setStatus('Error: ' + error.message);
    }
  };

  return (
    <div className={`App ${isDark ? 'dark' : 'light'}`}>
      <button className="mode-toggle" onClick={() => setIsDark(!isDark)}>
        {isDark ? '☀️' : '🌙'}
      </button>
      <div className="content">
        <button onClick={handleClick}>
          /start $tribify
        </button>
        {status && <div className="status">{status}</div>}
      </div>
    </div>
  );
}

export default App; 