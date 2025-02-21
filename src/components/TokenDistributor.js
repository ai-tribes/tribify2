import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';

// Estimated SOL fee per transaction
const ESTIMATED_SOL_PER_TX = 0.00001;

const LAMPORTS_FOR_ATA = 0.002 * LAMPORTS_PER_SOL; // Amount needed to create an ATA

const BATCH_SIZE = 4; // Number of operations per batch

const toBigNumber = (amount) => {
  // Convert to integer representation with 6 decimals
  return Math.floor(amount * Math.pow(10, 6)).toString();
};

const TokenDistributor = ({ parentWallet, subwallets, onComplete, refreshBalances }) => {
  const [walletInfo, setWalletInfo] = useState({
    tribifyBalance: 0,
    solBalance: 0
  });
  const [estimatedFees, setEstimatedFees] = useState({
    ataCreation: 0,
    transaction: 0,
    total: 0
  });
  const [distributionConfig, setDistributionConfig] = useState({
    totalAmount: '',
    numberOfWallets: '',
    amountPerWallet: 0,
    isRandomDistribution: false
  });

  // Add new state for distribution progress
  const [distributionStatus, setDistributionStatus] = useState({
    isDistributing: false,
    currentWallet: null,
    processedWallets: [],
    error: null
  });

  // Add new recovery status state
  const [recoveryStatus, setRecoveryStatus] = useState({
    isRecovering: false,
    currentPhase: null, // 'checking', 'creating_atas', 'transferring'
    processedCount: 0,
    totalWallets: 0,
    currentWallet: null,
    successfulTransfers: [],
    failedTransfers: [],
    totalRecovered: 0,
    error: null
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
      let ataCreationFees = 0;
      let ataCount = 0;

      // Check which wallets need ATAs
      for (let i = 0; i < Math.min(distributionConfig.numberOfWallets, subwallets.length); i++) {
        const wallet = subwallets[i];
        const recipientATA = await getAssociatedTokenAddress(
          tribifyMint,
          new PublicKey(wallet.publicKey)
        );

        const accountInfo = await connection.getAccountInfo(recipientATA);
        if (!accountInfo) {
          ataCount++;
        }
      }

      // Calculate ATA creation fees
      ataCreationFees = ataCount * (LAMPORTS_FOR_ATA / LAMPORTS_PER_SOL);

      // Calculate transaction fees
      const numBatches = Math.ceil(distributionConfig.numberOfWallets / BATCH_SIZE);
      const fundingBatchFees = ataCount > 0 ? numBatches * ESTIMATED_SOL_PER_TX : 0;
      const transferBatchFees = numBatches * ESTIMATED_SOL_PER_TX;
      const totalTransactionFees = fundingBatchFees + transferBatchFees;

      console.log('Fee Calculation:', {
        ataCount,
        ataCreationFees,
        numBatches,
        fundingBatchFees,
        transferBatchFees,
        totalTransactionFees
      });

      setEstimatedFees({
        ataCreation: ataCreationFees,
        transaction: totalTransactionFees,
        total: ataCreationFees + totalTransactionFees
      });
    } catch (error) {
      console.error('Error calculating fees:', error);
      setEstimatedFees({
        ataCreation: 0,
        transaction: 0,
        total: 0
      });
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
      setDistributionStatus({
        isDistributing: true,
        currentWallet: null,
        processedWallets: [],
        error: null
      });

      const selectedWallets = subwallets.slice(0, distributionConfig.numberOfWallets);
      
      // Confirmation dialog with details
      const confirmMessage = `Please verify:\n\n` +
        `Total Amount: ${distributionConfig.totalAmount.toLocaleString()} TRIBIFY\n` +
        `Number of Recipients: ${distributionConfig.numberOfWallets}\n` +
        `First Recipient: ${selectedWallets[0].publicKey.toString()}\n` +
        `Last Recipient: ${selectedWallets[selectedWallets.length - 1].publicKey.toString()}\n\n` +
        `This will require ONE signature to distribute to all wallets.\n\n` +
        `Proceed with distribution?`;

      if (!window.confirm(confirmMessage)) {
        setDistributionStatus(prev => ({ ...prev, isDistributing: false }));
        return;
      }

      const connection = new Connection(
        `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
        { commitment: 'confirmed' }
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
      
      // Calculate amounts for each wallet
      const amounts = distributionConfig.isRandomDistribution 
        ? generateRandomAmounts(distributionConfig.totalAmount, distributionConfig.numberOfWallets)
        : Array(distributionConfig.numberOfWallets).fill(distributionConfig.amountPerWallet);

      // Create single transaction for all distributions
      const transaction = new Transaction();
      
      // Add instructions for each wallet
      for (let i = 0; i < selectedWallets.length; i++) {
        const wallet = selectedWallets[i];
        const amount = amounts[i];
        
        setDistributionStatus(prev => ({
          ...prev,
          currentWallet: wallet.publicKey.toString()
        }));

        const recipientATA = await getAssociatedTokenAddress(
          tribifyMint,
          wallet.publicKey
        );

        // Check if ATA exists
        const accountInfo = await connection.getAccountInfo(recipientATA);
        if (!accountInfo) {
          // Add ATA creation instruction
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

        setDistributionStatus(prev => ({
          ...prev,
          processedWallets: [...prev.processedWallets, wallet.publicKey.toString()]
        }));
      }

      // Send the single transaction
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = parentPublicKey;

      try {
        const signed = await window.phantom.solana.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize());
        console.log('Distribution transaction sent:', signature);
        
        // Wait for confirmation
        await connection.confirmTransaction(signature);
        
        console.log('Distribution complete');
        onComplete?.();
        
        // Show success status briefly before closing
        setDistributionStatus(prev => ({
          ...prev,
          isDistributing: false,
          currentWallet: null,
          processedWallets: selectedWallets.map(w => w.publicKey.toString())
        }));
        
        setTimeout(() => {
          setDistributionStatus({
            isDistributing: false,
            currentWallet: null,
            processedWallets: [],
            error: null
          });
        }, 3000);

      } catch (error) {
        console.error('Distribution transaction failed:', error);
        setDistributionStatus(prev => ({
          ...prev,
          error: error.message
        }));
        throw error;
      }

    } catch (error) {
      console.error('Distribution failed:', error);
      setDistributionStatus(prev => ({
        ...prev,
        isDistributing: false,
        error: error.message
      }));
      alert(`Distribution failed: ${error.message}`);
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

  // Add this function before the RecoveryModal component
  const retryFailedTransfers = async () => {
    try {
      if (recoveryStatus.failedTransfers.length === 0) return;

      setRecoveryStatus(prev => ({
        ...prev,
        currentPhase: 'transferring',
        error: null
      }));

      const connection = new Connection(
        `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
        { commitment: 'confirmed' }
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

      // Create single transaction for all retries
      const transaction = new Transaction();

      // Add instructions for each failed transfer
      for (const failedAddress of recoveryStatus.failedTransfers) {
        setRecoveryStatus(prev => ({
          ...prev,
          currentWallet: failedAddress
        }));

        const recipientATA = await getAssociatedTokenAddress(
          tribifyMint,
          new PublicKey(failedAddress)
        );

        // Check if ATA exists
        const accountInfo = await connection.getAccountInfo(recipientATA);
        if (!accountInfo) {
          // Add ATA creation instruction
          transaction.add(
            createAssociatedTokenAccountInstruction(
              parentPublicKey,
              recipientATA,
              new PublicKey(failedAddress),
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
            toBigNumber(1) // Retry with minimum amount to test transfer
          )
        );
      }

      // Send the single retry transaction
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = parentPublicKey;

      const signed = await window.phantom.solana.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature);

      // Update status after successful retry
      setRecoveryStatus(prev => ({
        ...prev,
        currentPhase: null,
        failedTransfers: [],
        successfulTransfers: [
          ...prev.successfulTransfers,
          ...prev.failedTransfers
        ],
        currentWallet: null,
        error: null
      }));

      // Refresh balances
      await refreshBalances();

    } catch (error) {
      console.error('Retry failed:', error);
      setRecoveryStatus(prev => ({
        ...prev,
        currentPhase: null,
        error: `Retry failed: ${error.message}`
      }));
    }
  };

  // Update the RecoveryModal component
  const RecoveryModal = () => (
    <div className="recovery-modal">
      <div className="recovery-header">
        <h3>Token Recovery</h3>
        <div className="phase-indicator">
          <div className={`phase ${recoveryStatus.currentPhase === 'checking' ? 'active' : ''}`}>
            <span className="icon">🔍</span>
            <span>Checking</span>
          </div>
          <div className="phase-line"></div>
          <div className={`phase ${recoveryStatus.currentPhase === 'creating_atas' ? 'active' : ''}`}>
            <span className="icon">⚙️</span>
            <span>Setup</span>
          </div>
          <div className="phase-line"></div>
          <div className={`phase ${recoveryStatus.currentPhase === 'transferring' ? 'active' : ''}`}>
            <span className="icon">↗️</span>
            <span>Transfer</span>
          </div>
        </div>
      </div>

      <div className="recovery-progress">
        <div className="progress-bar-container">
          <div 
            className="progress-bar" 
            style={{ 
              width: `${(recoveryStatus.processedCount / recoveryStatus.totalWallets) * 100}%` 
            }}
          />
          <div className="progress-details">
            <span className="progress-text">
              {recoveryStatus.processedCount} / {recoveryStatus.totalWallets} Wallets
            </span>
            <span className="percentage">
              {Math.round((recoveryStatus.processedCount / recoveryStatus.totalWallets) * 100)}%
            </span>
          </div>
        </div>

        {recoveryStatus.currentWallet && (
          <div className="current-operation">
            <div className="operation-label">Current Wallet:</div>
            <div className="wallet-info">
              <div className="wallet-address">
                {recoveryStatus.currentWallet.slice(0, 6)}...{recoveryStatus.currentWallet.slice(-6)}
              </div>
              <div className={`status-indicator ${recoveryStatus.currentPhase}`}>
                {recoveryStatus.currentPhase === 'checking' && '🔍 Checking'}
                {recoveryStatus.currentPhase === 'creating_atas' && '⚙️ Creating ATA'}
                {recoveryStatus.currentPhase === 'transferring' && '↗️ Transferring'}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="recovery-stats">
        <div className="stats-grid">
          <div className="stat-card success">
            <div className="stat-header">Successfully Recovered</div>
            <div className="stat-value">{recoveryStatus.successfulTransfers.length}</div>
          </div>
          <div className="stat-card failed">
            <div className="stat-header">Failed Transfers</div>
            <div className="stat-value">{recoveryStatus.failedTransfers.length}</div>
          </div>
          <div className="stat-card total">
            <div className="stat-header">Total TRIBIFY Recovered</div>
            <div className="stat-value">{recoveryStatus.totalRecovered.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {recoveryStatus.error && (
        <div className="recovery-error">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{recoveryStatus.error}</span>
          </div>
          <button 
            className="dismiss-error"
            onClick={() => setRecoveryStatus(prev => ({ ...prev, error: null }))}
          >
            ×
          </button>
        </div>
      )}

      <div className="recovery-actions">
        {recoveryStatus.failedTransfers.length > 0 && (
          <button 
            className="retry-button"
            onClick={retryFailedTransfers}
          >
            <span className="icon">↻</span>
            Retry Failed ({recoveryStatus.failedTransfers.length})
          </button>
        )}
        <button 
          className="close-button"
          onClick={() => setRecoveryStatus(prev => ({ ...prev, isRecovering: false }))}
          disabled={recoveryStatus.currentPhase !== null}
        >
          {recoveryStatus.currentPhase ? 'Recovery in Progress...' : 'Close'}
        </button>
      </div>
    </div>
  );

  // Update the CSS
  const styles = `
  .recovery-modal {
    background: #1a1b1e;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    max-width: 600px;
    width: 100%;
    color: #fff;
  }

  .recovery-header {
    margin-bottom: 32px;
    text-align: center;
  }

  .recovery-header h3 {
    font-size: 24px;
    margin-bottom: 20px;
    color: #fff;
  }

  .phase-indicator {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 20px 0;
  }

  .phase {
    display: flex;
    flex-direction: column;
    align-items: center;
    opacity: 0.5;
    transition: all 0.3s ease;
  }

  .phase.active {
    opacity: 1;
    transform: scale(1.1);
  }

  .phase .icon {
    font-size: 24px;
    margin-bottom: 8px;
  }

  .phase-line {
    flex: 1;
    height: 2px;
    background: rgba(255, 255, 255, 0.1);
    margin: 0 12px;
  }

  .progress-bar-container {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    height: 24px;
    position: relative;
    overflow: hidden;
    margin-bottom: 24px;
  }

  .progress-bar {
    background: linear-gradient(90deg, #00ff87, #60efff);
    height: 100%;
    transition: width 0.3s ease;
    border-radius: 12px;
  }

  .progress-details {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 12px;
    font-size: 12px;
    font-weight: bold;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .current-operation {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 16px;
    margin-top: 20px;
  }

  .operation-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 8px;
  }

  .wallet-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .wallet-address {
    font-family: 'Roboto Mono', monospace;
    font-size: 14px;
    color: #00ff87;
  }

  .status-indicator {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin: 24px 0;
  }

  .stat-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 16px;
    text-align: center;
  }

  .stat-header {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 8px;
  }

  .stat-value {
    font-size: 24px;
    font-weight: bold;
  }

  .stat-card.success .stat-value { color: #00ff87; }
  .stat-card.failed .stat-value { color: #ff4757; }
  .stat-card.total .stat-value { color: #60efff; }

  .recovery-error {
    background: rgba(255, 71, 87, 0.1);
    border-radius: 12px;
    padding: 16px;
    margin: 24px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .error-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .dismiss-error {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    font-size: 20px;
  }

  .recovery-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
  }

  .retry-button, .close-button {
    padding: 8px 16px;
    border-radius: 8px;
    border: none;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
  }

  .retry-button {
    background: #60efff;
    color: #1a1b1e;
  }

  .retry-button:hover {
    background: #00ff87;
  }

  .close-button {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .close-button:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .close-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  `;

  // Add the styles to the document
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  // Update the distribution form section to use a shared progress component
  const ProgressDisplay = ({ status, config }) => (
    <div className="progress-display">
      <h4>Distribution Progress</h4>
      <div className="progress-container">
        <div className="progress-bar" 
          style={{ 
            width: `${(status.processedWallets.length / config.numberOfWallets) * 100}%` 
          }} 
        />
        <div className="progress-details">
          <span className="progress-text">
            {status.processedWallets.length} / {config.numberOfWallets} Wallets
          </span>
          <span className="percentage">
            {Math.round((status.processedWallets.length / config.numberOfWallets) * 100)}%
          </span>
        </div>
      </div>
      {status.currentWallet && (
        <div className="current-operation">
          <div className="operation-label">Processing Wallet:</div>
          <div className="wallet-info">
            <div className="wallet-address">
              {status.currentWallet.slice(0, 6)}...{status.currentWallet.slice(-6)}
            </div>
            <div className="status-indicator">
              ↗️ Transferring
            </div>
          </div>
        </div>
      )}
      {status.error && (
        <div className="operation-error">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{status.error}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="distribution-container">
      <div className="wallet-info-section">
        <div className="wallet-info-header">
          <h4>Parent Wallet Balances</h4>
          <button 
            className="refresh-button"
            onClick={refreshBalances}
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
            type="text"
            value={distributionConfig.numberOfWallets}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '' || /^\d+$/.test(value)) {
                const numValue = value === '' ? '' : parseInt(value);
                if (value === '' || (numValue >= 1 && numValue <= 100)) {
                  setDistributionConfig(prev => ({
                    ...prev,
                    numberOfWallets: value
                  }));
                }
              }
            }}
            placeholder="Enter number (1-100)"
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
                <div>ATA Creation: ~{estimatedFees.ataCreation.toFixed(4)} SOL</div>
                <div>Transaction Fees: ~{estimatedFees.transaction.toFixed(6)} SOL</div>
                <div className="total-fees">Total: ~{estimatedFees.total.toFixed(4)} SOL</div>
              </div>
            </div>
          </div>
        )}

        {(distributionStatus.isDistributing || recoveryStatus.isRecovering) && (
          <div className="modal-overlay">
            <div className="progress-modal">
              <ProgressDisplay 
                status={distributionStatus.isDistributing ? distributionStatus : recoveryStatus}
                config={distributionConfig}
              />
            </div>
          </div>
        )}

        <button 
          className="distribute-button"
          disabled={
            !distributionConfig.totalAmount || 
            distributionConfig.totalAmount <= 0 ||
            estimatedFees.total > walletInfo.solBalance ||
            distributionStatus.isDistributing
          }
          onClick={distributeTokens}
        >
          {distributionStatus.isDistributing 
            ? 'Distribution in Progress...'
            : estimatedFees.total > walletInfo.solBalance 
            ? 'Insufficient SOL for fees'
            : 'Start Distribution'
          }
        </button>
      </div>
    </div>
  );
};

export default TokenDistributor; 