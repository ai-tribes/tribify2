import React, { useState, useEffect } from 'react';
import './App.css';
import { Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Need this shit for Solana
window.Buffer = window.Buffer || require('buffer').Buffer;

function App() {
  // Check if it's daytime (between 6am and 6pm)
  const isDaytime = () => {
    const hours = new Date().getHours();
    return hours >= 6 && hours < 18;
  };

  const [isDark, setIsDark] = useState(!isDaytime());
  const [status, setStatus] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);

  // Connection instance
  const connection = new Connection(
    `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
    'confirmed'
  );

  // Update theme based on time of day
  useEffect(() => {
    const interval = setInterval(() => {
      setIsDark(!isDaytime());
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Check connection and get balance
  useEffect(() => {
    const checkConnection = async () => {
      if (window.solana && window.solana.isConnected) {
        const response = await window.solana.connect({ onlyIfTrusted: true });
        setIsConnected(true);
        setPublicKey(response.publicKey.toString());
        updateBalance(response.publicKey);
        fetchTransactions(response.publicKey);
      }
    };
    checkConnection();
  }, []);

  const updateBalance = async (pubKey) => {
    try {
      const bal = await connection.getBalance(pubKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Balance error:', error);
    }
  };

  const fetchTransactions = async (pubKey) => {
    try {
      const signatures = await connection.getSignaturesForAddress(pubKey, { limit: 5 });
      setTransactions(signatures);
    } catch (error) {
      console.error('Transaction fetch error:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await window.solana.disconnect();
      setIsConnected(false);
      setPublicKey(null);
      setBalance(null);
      setTransactions([]);
      setStatus('');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  const handleClick = async () => {
    if (!window.solana) {
      alert("Get Phantom wallet!");
      return;
    }

    try {
      if (!isConnected) {
        setStatus('Connecting...');
        const response = await window.solana.connect();
        setIsConnected(true);
        setPublicKey(response.publicKey.toString());
        await updateBalance(response.publicKey);
        await fetchTransactions(response.publicKey);
        setStatus('Connected: ' + response.publicKey.toString().slice(0,4) + '...');
      } else {
        // Transaction logic...
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: window.solana.publicKey,
            toPubkey: window.solana.publicKey,
            lamports: LAMPORTS_PER_SOL * 0.001
          })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = window.solana.publicKey;

        setStatus('Please sign...');
        const signed = await window.solana.signTransaction(transaction);
        
        setStatus('Sending...');
        const signature = await connection.sendRawTransaction(signed.serialize());
        
        setStatus('Confirming...');
        await connection.confirmTransaction(signature);
        setStatus('Transaction confirmed! ◈');

        // Update balance and transactions after confirmation
        await updateBalance(window.solana.publicKey);
        await fetchTransactions(window.solana.publicKey);
      }
    } catch (error) {
      console.error(error);
      setStatus('Error: ' + error.message);
      if (error.code === 4001) {
        setIsConnected(false);
        setPublicKey(null);
        setBalance(null);
        setTransactions([]);
      }
    }
  };

  return (
    <div className={`App ${isDark ? 'dark' : 'light'}`}>
      <button className="mode-toggle" onClick={() => setIsDark(!isDark)}>
        {isDark ? '◯' : '●'}
      </button>
      <div className="content">
        <button onClick={handleClick}>
          {isConnected ? '⬡ Send' : '⬢ Connect'}
        </button>
        {isConnected && (
          <>
            <div className="wallet-info">
              <div>◈ {publicKey?.slice(0,4)}...{publicKey?.slice(-4)}</div>
              <div>◇ {balance?.toFixed(4)} SOL</div>
              <button className="disconnect" onClick={handleDisconnect}>
                ⬚ Disconnect
              </button>
            </div>
            {transactions.length > 0 && (
              <div className="transactions">
                <div className="tx-header">Recent Transactions</div>
                {transactions.map((tx, i) => (
                  <div key={i} className="tx-item">
                    ◊ {tx.signature.slice(0,4)}...{tx.signature.slice(-4)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {status && <div className="status">{status}</div>}
      </div>
    </div>
  );
}

export default App; 