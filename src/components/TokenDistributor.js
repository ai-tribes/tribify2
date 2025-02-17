import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';

// Estimated SOL fee per transaction
const ESTIMATED_SOL_PER_TX = 0.000005;

const toBigNumber = (amount) => {
  // Convert to integer representation with 6 decimals
  return Math.floor(amount * Math.pow(10, 6)).toString();
};

const TokenDistributor = ({ parentWallet, subwallets, onComplete }) => {
  const [walletInfo, setWalletInfo] = useState({
    tribifyBalance: 0,
    solBalance: 0
  });
  const [distributionConfig, setDistributionConfig] = useState({
    totalAmount: '',
    numberOfWallets: 10,
    amountPerWallet: 0,
    isRandomDistribution: false
  });

  const fetchWalletBalances = async () => {
    try {
      if (!window.phantom?.solana?.isConnected) {
        console.log('Wallet not connected');
        return;
      }

      // Use the same connection from App.js
      const connection = new Connection(
        `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
        {
          commitment: 'confirmed',
          wsEndpoint: undefined,
          confirmTransactionInitialTimeout: 60000
        }
      );

      const walletPublicKey = new PublicKey(window.phantom.solana.publicKey.toString());
      const tribifyMint = new PublicKey('672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump');

      // Get SOL balance
      const solBalance = await connection.getBalance(walletPublicKey);

      // Get TRIBIFY balance
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        walletPublicKey,
        { mint: tribifyMint }
      );

      const tribifyBalance = tokenAccounts.value.length 
        ? tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount 
        : 0;

      setWalletInfo({
        tribifyBalance,
        solBalance: solBalance / LAMPORTS_PER_SOL
      });

    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  // Calculate total SOL fees
  const calculateTotalFees = () => {
    return distributionConfig.numberOfWallets * ESTIMATED_SOL_PER_TX;
  };

  // Calculate per wallet amount
  useEffect(() => {
    if (distributionConfig.totalAmount && distributionConfig.numberOfWallets > 0) {
      const perWallet = distributionConfig.isRandomDistribution 
        ? 0 // Don't show per wallet for random distribution
        : distributionConfig.totalAmount / distributionConfig.numberOfWallets;
      
      setDistributionConfig(prev => ({
        ...prev,
        amountPerWallet: perWallet
      }));
    }
  }, [distributionConfig.totalAmount, distributionConfig.numberOfWallets, distributionConfig.isRandomDistribution]);

  useEffect(() => {
    fetchWalletBalances();
  }, []);

  const distributeTokens = async () => {
    try {
      const connection = new Connection(
        `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
        {
          commitment: 'confirmed',
          wsEndpoint: undefined,
          confirmTransactionInitialTimeout: 60000
        }
      );

      const tribifyMint = new PublicKey('672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump');
      const parentPublicKey = new PublicKey(window.phantom.solana.publicKey.toString());

      // Get parent token account
      const parentTokenAccount = (await connection.getParsedTokenAccountsByOwner(
        parentPublicKey,
        { mint: tribifyMint }
      )).value[0].pubkey;

      // Create a single transaction
      const transaction = new Transaction();

      // Select wallets and calculate amounts
      const selectedWallets = subwallets.slice(0, distributionConfig.numberOfWallets);
      const amounts = distributionConfig.isRandomDistribution 
        ? generateRandomAmounts(distributionConfig.totalAmount, distributionConfig.numberOfWallets)
        : Array(distributionConfig.numberOfWallets).fill(distributionConfig.amountPerWallet);

      // Add instructions for each transfer
      for (let i = 0; i < selectedWallets.length; i++) {
        const wallet = selectedWallets[i];
        const amount = amounts[i];

        // Get or create ATA for recipient
        const recipientATA = await getAssociatedTokenAddress(
          tribifyMint,
          new PublicKey(wallet.publicKey)
        );

        // Check if ATA exists
        const accountInfo = await connection.getAccountInfo(recipientATA);
        if (!accountInfo) {
          // Add create ATA instruction if needed
          transaction.add(
            createAssociatedTokenAccountInstruction(
              parentPublicKey, // payer
              recipientATA, // ata
              new PublicKey(wallet.publicKey), // owner
              tribifyMint // mint
            )
          );
        }

        // Add transfer instruction
        transaction.add(
          createTransferInstruction(
            parentTokenAccount, // source
            recipientATA, // destination
            parentPublicKey, // owner
            toBigNumber(amount) // amount with decimals
          )
        );
      }

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = parentPublicKey;

      // Sign and send transaction
      try {
        const signed = await window.phantom.solana.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(signature);

        console.log('Distribution complete:', signature);
        onComplete?.();
      } catch (error) {
        console.error('Transaction failed:', error);
        throw error;
      }
    } catch (error) {
      console.error('Distribution failed:', error);
    }
  };

  // Helper function to generate random amounts that sum to total
  const generateRandomAmounts = (total, count) => {
    const amounts = Array(count).fill(0);
    let remaining = total;

    // Generate random proportions
    const proportions = Array(count).fill(0).map(() => Math.random());
    const sum = proportions.reduce((a, b) => a + b, 0);

    // Normalize proportions to sum to total
    return proportions.map((p, i) => {
      const amount = (p / sum) * total;
      // For last item, use remaining to avoid floating point errors
      return i === count - 1 ? remaining : amount;
    });
  };

  return (
    <div className="distribution-container">
      <div className="wallet-info-section">
        <div className="wallet-info-header">
          <h4>Parent Wallet Balances</h4>
          <button 
            className="refresh-button"
            onClick={fetchWalletBalances}
          >
            Refresh Balances
          </button>
        </div>
        <div className="balance-info">
          <div className="balance-item">
            <span className="balance-label">TRIBIFY Balance:</span>
            <span className="balance-value">{walletInfo.tribifyBalance.toLocaleString()} TRIBIFY</span>
          </div>
          <div className="balance-item">
            <span className="balance-label">SOL Balance:</span>
            <span className="balance-value sol">{walletInfo.solBalance.toFixed(4)} SOL</span>
          </div>
        </div>
      </div>

      <div className="distribution-form">
        <div className="form-group">
          <label>Total TRIBIFY to Distribute:</label>
          <input
            type="number"
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
            max={walletInfo.tribifyBalance}
            placeholder={`Max: ${walletInfo.tribifyBalance.toLocaleString()}`}
          />
        </div>

        <div className="form-group">
          <label>Number of Wallets to Distribute To (1-100):</label>
          <input
            type="number"
            value={distributionConfig.numberOfWallets}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value) && value >= 1 && value <= 100) {
                setDistributionConfig(prev => ({
                  ...prev,
                  numberOfWallets: value
                }));
              }
            }}
            min="1"
            max="100"
          />
        </div>

        <div className="form-group distribution-type">
          <label>Distribution Type:</label>
          <div className="distribution-options">
            <div 
              className={`distribution-option ${!distributionConfig.isRandomDistribution ? 'active' : ''}`}
              onClick={() => setDistributionConfig(prev => ({ ...prev, isRandomDistribution: false }))}
            >
              <div className="option-header">
                <input
                  type="radio"
                  checked={!distributionConfig.isRandomDistribution}
                  onChange={() => setDistributionConfig(prev => ({ ...prev, isRandomDistribution: false }))}
                />
                <span>Equal Distribution</span>
              </div>
              <p className="option-description">All selected wallets receive the same amount of tokens</p>
            </div>

            <div 
              className={`distribution-option ${distributionConfig.isRandomDistribution ? 'active' : ''}`}
              onClick={() => setDistributionConfig(prev => ({ ...prev, isRandomDistribution: true }))}
            >
              <div className="option-header">
                <input
                  type="radio"
                  checked={distributionConfig.isRandomDistribution}
                  onChange={() => setDistributionConfig(prev => ({ ...prev, isRandomDistribution: true }))}
                />
                <span>Random Distribution</span>
              </div>
              <p className="option-description">Tokens are distributed in random amounts while maintaining the total</p>
            </div>
          </div>
        </div>

        {distributionConfig.totalAmount > 0 && distributionConfig.numberOfWallets > 0 && (
          <div className="distribution-preview">
            {!distributionConfig.isRandomDistribution && (
              <div className="preview-item">
                <span>Amount per wallet:</span>
                <span>{distributionConfig.amountPerWallet.toLocaleString()} TRIBIFY</span>
              </div>
            )}
            <div className="preview-item">
              <span>Total wallets:</span>
              <span>{distributionConfig.numberOfWallets}</span>
            </div>
            <div className="preview-item">
              <span>Total to distribute:</span>
              <span>{distributionConfig.totalAmount.toLocaleString()} TRIBIFY</span>
            </div>
            <div className="preview-item fee-estimate">
              <span>Estimated SOL fee:</span>
              <span>{calculateTotalFees().toFixed(6)} SOL</span>
            </div>
          </div>
        )}

        <button 
          className="distribute-button"
          disabled={
            !distributionConfig.totalAmount || 
            distributionConfig.totalAmount <= 0 ||
            calculateTotalFees() > walletInfo.solBalance
          }
          onClick={distributeTokens}
        >
          {calculateTotalFees() > walletInfo.solBalance 
            ? 'Insufficient SOL for fees'
            : 'Start Distribution'
          }
        </button>
      </div>
    </div>
  );
};

export default TokenDistributor; 