import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';

// Use the same Helius RPC URL that's used in WalletPage
const HELIUS_RPC_URL = `https://rpc-devnet.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_API_KEY}`;
const ESTIMATED_FEE_PER_TX = 0.00001; // SOL per transaction

// Add utility function for safe number conversion
const toBigNumber = (amount, decimals = 6) => {
  const num = Math.floor(amount * Math.pow(10, decimals));
  return num.toString(); // Convert to string to handle large numbers safely
};

const TokenDistributor = ({ parentWallet, subwallets, onComplete }) => {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState([]);
  const [walletInfo, setWalletInfo] = useState({
    tribifyBalance: 0,
    solBalance: 0
  });
  const [distributionConfig, setDistributionConfig] = useState({
    numberOfWallets: 10,
    totalAmount: '',
    distributeRandomly: false
  });

  const addProgress = (message, type = 'info') => {
    setProgress(prev => [...prev, { message, type, timestamp: Date.now() }]);
  };

  const fetchWalletBalances = async () => {
    try {
      if (!parentWallet?.isConnected || !parentWallet?.publicKey) {
        console.log('Wallet not connected');
        return;
      }

      const connection = new Connection(HELIUS_RPC_URL);
      const tribifyMint = new PublicKey('672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump');
      const publicKey = new PublicKey(parentWallet.publicKey.toString());

      // Fetch SOL balance
      const solBalance = await connection.getBalance(publicKey);

      // Fetch TRIBIFY balance
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { mint: tribifyMint }
      );

      const tribifyBalance = tokenAccounts.value.length 
        ? tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount 
        : 0;

      setWalletInfo({
        tribifyBalance,
        solBalance: solBalance / LAMPORTS_PER_SOL
      });

      addProgress(`Wallet balances loaded: ${tribifyBalance.toLocaleString()} TRIBIFY, ${(solBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`, 'info');
    } catch (error) {
      console.error('Error fetching balances:', error);
      addProgress('Error fetching balances: ' + error.message, 'error');
    }
  };

  const calculateFees = () => {
    const txCount = distributionConfig.numberOfWallets;
    return txCount * ESTIMATED_FEE_PER_TX;
  };

  const getAmountPerWallet = () => {
    if (!distributionConfig.totalAmount || distributionConfig.numberOfWallets <= 0) return 0;
    return distributionConfig.totalAmount / distributionConfig.numberOfWallets;
  };

  const distributeTokens = async () => {
    if (!distributionConfig.totalAmount || distributionConfig.numberOfWallets <= 0) {
      addProgress('Please enter valid distribution amounts', 'error');
      return;
    }

    try {
      setStatus('distributing');
      addProgress('Starting distribution process...', 'info');

      const connection = new Connection(HELIUS_RPC_URL);
      const tribifyMint = new PublicKey('672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump');

      // Select random wallets if needed
      let selectedWallets = distributionConfig.distributeRandomly
        ? [...subwallets].sort(() => 0.5 - Math.random()).slice(0, distributionConfig.numberOfWallets)
        : subwallets.slice(0, distributionConfig.numberOfWallets);

      // Create all transactions first
      const transactions = [];
      const amountPerWallet = getAmountPerWallet();

      for (const subwallet of selectedWallets) {
        const subwalletTokenAccount = await getAssociatedTokenAddress(
          tribifyMint,
          subwallet.publicKey
        );

        const transaction = new Transaction();
        
        // Add ATA creation if needed
        const accountInfo = await connection.getAccountInfo(subwalletTokenAccount);
        if (!accountInfo) {
          transaction.add(
            createAssociatedTokenAccountInstruction(
              new PublicKey(parentWallet.publicKey.toString()),
              subwalletTokenAccount,
              subwallet.publicKey,
              tribifyMint
            )
          );
        }

        // Add transfer instruction
        const amount = distributionConfig.distributeRandomly
          ? Math.random() * amountPerWallet * 2 // Random amount between 0 and 2x the average
          : amountPerWallet;

        transaction.add(
          createTransferInstruction(
            (await connection.getParsedTokenAccountsByOwner(
              new PublicKey(parentWallet.publicKey.toString()),
              { mint: tribifyMint }
            )).value[0].pubkey,
            subwalletTokenAccount,
            new PublicKey(parentWallet.publicKey.toString()),
            toBigNumber(amount)
          )
        );

        transactions.push(transaction);
      }

      // Sign and send all transactions
      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = new PublicKey(parentWallet.publicKey.toString());

        const signed = await parentWallet.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(signature);

        addProgress(`Completed transfer ${i + 1}/${transactions.length}`, 'success');
      }

      setStatus('completed');
      addProgress('Distribution completed successfully!', 'success');
      onComplete?.();

    } catch (error) {
      setStatus('error');
      addProgress(`Distribution failed: ${error.message}`, 'error');
      console.error('Distribution error:', error);
    }
  };

  useEffect(() => {
    fetchWalletBalances();
  }, [parentWallet]);

  return (
    <div className="distribution-container">
      <div className="wallet-info-section">
        <h4>Parent Wallet Balances</h4>
        <div className="balance-info">
          <div className="balance-item">
            <span className="balance-label">TRIBIFY Balance:</span>
            <span className="balance-value">{walletInfo.tribifyBalance.toLocaleString()} TRIBIFY</span>
          </div>
          <div className="balance-item">
            <span className="balance-label">SOL Balance:</span>
            <span className="balance-value">{walletInfo.solBalance.toFixed(4)} SOL</span>
          </div>
        </div>
      </div>

      <div className="distribution-form">
        <div className="form-group">
          <label htmlFor="numberOfWallets">Number of Wallets (1-100):</label>
          <input
            id="numberOfWallets"
            type="number"
            min="1"
            max="100"
            value={distributionConfig.numberOfWallets}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (value >= 1 && value <= 100) {
                setDistributionConfig(prev => ({
                  ...prev,
                  numberOfWallets: value
                }));
              }
            }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="totalAmount">Total TRIBIFY to Distribute:</label>
          <input
            id="totalAmount"
            type="number"
            min="0"
            max={walletInfo.tribifyBalance}
            value={distributionConfig.totalAmount}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value) && value >= 0 && value <= walletInfo.tribifyBalance) {
                setDistributionConfig(prev => ({
                  ...prev,
                  totalAmount: value
                }));
              }
            }}
          />
        </div>

        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              checked={distributionConfig.distributeRandomly}
              onChange={(e) => {
                setDistributionConfig(prev => ({
                  ...prev,
                  distributeRandomly: e.target.checked
                }));
              }}
            />
            Distribute Randomly
          </label>
        </div>

        {!distributionConfig.distributeRandomly && distributionConfig.totalAmount > 0 && (
          <div className="distribution-preview">
            Amount per wallet: {getAmountPerWallet().toLocaleString()} TRIBIFY
          </div>
        )}

        <div className="fee-preview">
          Estimated total fees: {calculateFees().toFixed(4)} SOL
        </div>
      </div>

      <div className="distribution-progress">
        {progress.map((item, index) => (
          <div key={index} className={`progress-item ${item.type}`}>
            <span>{item.message}</span>
            <span className="progress-timestamp">
              {new Date(item.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>

      <button 
        className="distribute-button"
        onClick={distributeTokens}
        disabled={
          status === 'distributing' || 
          !distributionConfig.totalAmount || 
          distributionConfig.numberOfWallets <= 0 ||
          calculateFees() > walletInfo.solBalance
        }
      >
        {status === 'distributing' ? 'Distributing...' : 'Start Distribution'}
      </button>
    </div>
  );
};

export default TokenDistributor; 