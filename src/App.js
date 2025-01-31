import React, { useState, useEffect } from 'react';
import './App.css';
import { Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

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
  const [nicknames, setNicknames] = useState({});
  const [editingNickname, setEditingNickname] = useState(null);
  const [treasuryBalances, setTreasuryBalances] = useState({
    sol: 0,
    usdc: 0,
    tribify: 0
  });

  // Core functions
  const handleConnection = async () => {
    try {
      setStatus('Connecting...');
      
      // Check specifically for Phantom
      if (!window.phantom?.solana || !window.phantom.solana.isPhantom) {
        setStatus('Please install Phantom wallet');
        return;
      }

      const resp = await window.phantom.solana.connect();
      const userPublicKey = resp.publicKey.toString();

      // Check if they have ANY tokens first
      const hasTokenAccount = await checkTokenAccount(userPublicKey);

      // Put the treasury check BACK:
      if (userPublicKey === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv') {
        setIsConnected(true);
        setPublicKey(userPublicKey);
        setStatus('Treasury wallet connected!');
        await updateBalance(userPublicKey);
        fetchTokenHolders();
        return;
      }

      // EVERYONE ELSE pays $1 and gets tokens
      setStatus('Please approve payment (0.001 SOL) to receive 100 $TRIBIFY...');
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: resp.publicKey,
          toPubkey: new PublicKey('DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv'),
          lamports: LAMPORTS_PER_SOL * 0.001
        })
      );

      // Send payment
      const { blockhash } = await connection.getLatestBlockhash('processed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = resp.publicKey;
      const signed = await window.phantom.solana.signTransaction(transaction);
      await connection.sendRawTransaction(signed.serialize());

      // They paid! Let them in
      setIsConnected(true);
      setPublicKey(userPublicKey);

      if (!hasTokenAccount) {
        // New user - need to create account first
        setStatus('Creating your token account...');
      }

      // Send tokens with retries
      let retries = 3;
      while (retries > 0) {
        try {
          const response = await fetch('/api/send-tribify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipient: userPublicKey,
              amount: TRIBIFY_REWARD_AMOUNT,
              createAccount: !hasTokenAccount  // Tell API if we need account creation
            })
          });

          const data = await response.json();
          setStatus('Tokens sent! Check your wallet.');
          fetchTokenHolders();
          break;
        } catch (error) {
          retries--;
          if (retries === 0) {
            setStatus('Connected, but token send failed. Please try refreshing.');
          } else {
            setStatus(`Retrying token send (${retries} attempts left)...`);
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }
    } catch (error) {
      console.error('Connection error:', error);
      setStatus('Error: ' + error.message);
    }
  };

  const fetchTokenHolders = async () => {
    try {
      const mintPubkey = new PublicKey(TRIBIFY_TOKEN_MINT);
      const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC mint
      const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey);
      
      const holders = await Promise.all(
        largestAccounts.value.map(async (account) => {
          const accountInfo = await connection.getParsedAccountInfo(account.address);
          const address = accountInfo.value.data.parsed.info.owner;
          
          // Get SOL balance
          const solBalance = await connection.getBalance(new PublicKey(address));
          
          // Try to get USDC balance
          let usdcBalance = 0;
          try {
            const usdcAta = await getAssociatedTokenAddress(usdcMint, new PublicKey(address));
            const usdcAccount = await connection.getTokenAccountBalance(usdcAta);
            usdcBalance = usdcAccount.value.uiAmount || 0;
          } catch {
            // No USDC account, leave as 0
          }

          return {
            address,
            tokenBalance: (account.amount / Math.pow(10, 6)) || 0,
            solBalance: (solBalance / LAMPORTS_PER_SOL) || 0,
            usdcBalance: usdcBalance || 0
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

  // Add function to check token account
  const checkTokenAccount = async (walletAddress) => {
    try {
      const mintPubkey = new PublicKey(TRIBIFY_TOKEN_MINT);
      const ata = await getAssociatedTokenAddress(
        mintPubkey,
        new PublicKey(walletAddress)
      );
      
      const account = await connection.getAccountInfo(ata);
      return !!account;  // true if account exists
    } catch {
      return false;
    }
  };

  // Add function to fetch treasury balances
  const fetchTreasuryBalances = async () => {
    try {
      const treasuryPubkey = new PublicKey('DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv');
      const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      const tribifyMint = new PublicKey(TRIBIFY_TOKEN_MINT);

      // Get SOL balance
      const solBalance = await connection.getBalance(treasuryPubkey);
      
      // Get USDC balance
      let usdcBalance = 0;
      try {
        const usdcAta = await getAssociatedTokenAddress(usdcMint, treasuryPubkey);
        const usdcAccount = await connection.getTokenAccountBalance(usdcAta);
        usdcBalance = usdcAccount.value.uiAmount || 0;
      } catch {}

      // Get TRIBIFY balance
      let tribifyBalance = 0;
      try {
        const tribifyAta = await getAssociatedTokenAddress(tribifyMint, treasuryPubkey);
        const tribifyAccount = await connection.getTokenAccountBalance(tribifyAta);
        tribifyBalance = tribifyAccount.value.uiAmount || 0;
      } catch {}

      setTreasuryBalances({
        sol: solBalance / LAMPORTS_PER_SOL,
        usdc: usdcBalance,
        tribify: tribifyBalance
      });
    } catch (error) {
      console.error('Failed to fetch treasury balances:', error);
    }
  };

  // Call it in useEffect
  useEffect(() => {
    fetchTreasuryBalances();
  }, []);

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
            {publicKey === 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv' ? (
              <>
                <div>◈ {publicKey}</div>
                <div>◇ {balance} SOL</div>
                <div>◇ {treasuryBalances.tribify.toLocaleString()} $TRIBIFY</div>
                <div>◇ ${treasuryBalances.usdc.toLocaleString()} USDC</div>
              </>
            ) : (
              <>
                <div>◈ {publicKey}</div>
                <div>◇ {balance} SOL</div>
              </>
            )}
          </div>

          <div className="token-holders">
            <h3>TRIBIFY Holders</h3>
            {tokenHolders.map((holder, i) => (
              <div key={i} className="holder-item">
                <div className="address-container">
                  <div>◈ {holder.address}</div>
                  {editingNickname === holder.address ? (
                    <form 
                      className="nickname-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const nickname = e.target.nickname.value;
                        setNicknames({...nicknames, [holder.address]: nickname});
                        setEditingNickname(null);
                      }}
                    >
                      <input 
                        name="nickname"
                        defaultValue={nicknames[holder.address] || ''}
                        placeholder="Enter nickname"
                        autoFocus
                      />
                      <button type="submit">✓</button>
                    </form>
                  ) : (
                    <div 
                      className="nickname"
                      onClick={() => setEditingNickname(holder.address)}
                    >
                      {nicknames[holder.address] || '+ Add nickname'}
                    </div>
                  )}
                </div>
                <div className="balances">
                  <div>◇ {(holder.tokenBalance || 0).toLocaleString()} $TRIBIFY</div>
                  <div>◇ {(holder.solBalance || 0).toLocaleString()} SOL</div>
                  <div>◇ ${(holder.usdcBalance || 0).toLocaleString()} USDC</div>
                </div>
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