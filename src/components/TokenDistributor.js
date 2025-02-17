import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';

// Estimated SOL fee per transaction
const ESTIMATED_SOL_PER_TX = 0.000005;

const LAMPORTS_FOR_ATA = 0.002 * LAMPORTS_PER_SOL; // Amount needed to create an ATA

const toBigNumber = (amount) => {
  // Convert to integer representation with 6 decimals
  return Math.floor(amount * Math.pow(10, 6)).toString();
};

const TokenDistributor = ({ parentWallet, subwallets, onComplete }) => {
  const [walletInfo, setWalletInfo] = useState({
    tribifyBalance: 0,
    solBalance: 0
  });
  const [estimatedFees, setEstimatedFees] = useState(0);
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
  const calculateTotalFees = async () => {
    try {
      const connection = new Connection(
        `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
        { commitment: 'confirmed' }
      );

      const tribifyMint = new PublicKey('672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump');
      let totalFees = 0;

      // Check which wallets need ATAs and calculate total cost
      for (let i = 0; i < distributionConfig.numberOfWallets && i < subwallets.length; i++) {
        const wallet = subwallets[i];
        const recipientATA = await getAssociatedTokenAddress(
          tribifyMint,
          wallet.publicKey
        );

        const accountInfo = await connection.getAccountInfo(recipientATA);
        if (!accountInfo) {
          totalFees += LAMPORTS_FOR_ATA / LAMPORTS_PER_SOL;
        }
      }

      // Add transaction fees for both funding and transfer transactions
      const batchCount = Math.ceil(distributionConfig.numberOfWallets / 4);
      totalFees += batchCount * 2 * ESTIMATED_SOL_PER_TX;

      setEstimatedFees(totalFees);
    } catch (error) {
      console.error('Error calculating fees:', error);
      setEstimatedFees(0);
    }
  };

  // Update fees when config changes
  useEffect(() => {
    calculateTotalFees();
  }, [distributionConfig.numberOfWallets]);

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
      console.log('Starting distribution...');
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
      const parentTokenAccounts = await connection.getParsedTokenAccountsByOwner(
        parentPublicKey,
        { mint: tribifyMint }
      );

      if (!parentTokenAccounts.value.length) {
        throw new Error('No TRIBIFY token account found for parent wallet');
      }

      const parentTokenAccount = parentTokenAccounts.value[0].pubkey;
      
      // Select wallets and calculate amounts
      const selectedWallets = subwallets.slice(0, distributionConfig.numberOfWallets);
      const amounts = distributionConfig.isRandomDistribution 
        ? generateRandomAmounts(distributionConfig.totalAmount, distributionConfig.numberOfWallets)
        : Array(distributionConfig.numberOfWallets).fill(distributionConfig.amountPerWallet);

      // First, fund wallets that need ATAs
      const BATCH_SIZE = 4;
      for (let i = 0; i < selectedWallets.length; i += BATCH_SIZE) {
        const batchWallets = selectedWallets.slice(i, i + BATCH_SIZE);
        const transaction = new Transaction();

        // Check which wallets need funding for ATAs
        for (let j = 0; j < batchWallets.length; j++) {
          const wallet = batchWallets[j];
          const recipientATA = await getAssociatedTokenAddress(
            tribifyMint,
            wallet.publicKey
          );

          const accountInfo = await connection.getAccountInfo(recipientATA);
          if (!accountInfo) {
            // Add SOL transfer instruction
            transaction.add(
              SystemProgram.transfer({
                fromPubkey: parentPublicKey,
                toPubkey: wallet.publicKey,
                lamports: LAMPORTS_FOR_ATA
              })
            );
          }
        }

        if (transaction.instructions.length > 0) {
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = parentPublicKey;

          try {
            const signed = await window.phantom.solana.signTransaction(transaction);
            const signature = await connection.sendRawTransaction(signed.serialize());
            console.log(`Funding batch ${Math.floor(i/BATCH_SIZE) + 1} sent:`, signature);
            await connection.confirmTransaction(signature);
          } catch (error) {
            console.error('Funding transaction failed:', error);
            throw error;
          }
        }
      }

      // Now do token transfers in batches
      for (let i = 0; i < selectedWallets.length; i += BATCH_SIZE) {
        const batchWallets = selectedWallets.slice(i, i + BATCH_SIZE);
        const batchAmounts = amounts.slice(i, i + BATCH_SIZE);
        const transaction = new Transaction();

        for (let j = 0; j < batchWallets.length; j++) {
          const wallet = batchWallets[j];
          const amount = batchAmounts[j];
          
          const recipientATA = await getAssociatedTokenAddress(
            tribifyMint,
            wallet.publicKey
          );

          // Create ATA if needed
          const accountInfo = await connection.getAccountInfo(recipientATA);
          if (!accountInfo) {
            transaction.add(
              createAssociatedTokenAccountInstruction(
                parentPublicKey,
                recipientATA,
                wallet.publicKey,
                tribifyMint
              )
            );
          }

          // Add transfer instruction
          transaction.add(
            createTransferInstruction(
              parentTokenAccount,
              recipientATA,
              parentPublicKey,
              toBigNumber(amount)
            )
          );
        }

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = parentPublicKey;

        try {
          const signed = await window.phantom.solana.signTransaction(transaction);
          const signature = await connection.sendRawTransaction(signed.serialize());
          console.log(`Transfer batch ${Math.floor(i/BATCH_SIZE) + 1} sent:`, signature);
          await connection.confirmTransaction(signature);
        } catch (error) {
          console.error('Transfer transaction failed:', error);
          throw error;
        }
      }

      console.log('All distributions complete');
      onComplete?.();
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
              <span>Estimated SOL fees:</span>
              <div className="fee-breakdown">
                <div>ATA Creation: ~{((LAMPORTS_FOR_ATA / LAMPORTS_PER_SOL) * distributionConfig.numberOfWallets).toFixed(4)} SOL</div>
                <div>Transaction Fees: ~{(estimatedFees - ((LAMPORTS_FOR_ATA / LAMPORTS_PER_SOL) * distributionConfig.numberOfWallets)).toFixed(6)} SOL</div>
                <div className="total-fees">Total: ~{estimatedFees.toFixed(4)} SOL</div>
              </div>
            </div>
          </div>
        )}

        <button 
          className="distribute-button"
          disabled={
            !distributionConfig.totalAmount || 
            distributionConfig.totalAmount <= 0 ||
            estimatedFees > walletInfo.solBalance
          }
          onClick={distributeTokens}
        >
          {estimatedFees > walletInfo.solBalance 
            ? 'Insufficient SOL for fees'
            : 'Start Distribution'
          }
        </button>
      </div>
    </div>
  );
};

export default TokenDistributor; 