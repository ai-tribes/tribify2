import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Estimated SOL fee per transaction
const ESTIMATED_SOL_PER_TX = 0.000005;

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

        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              checked={distributionConfig.isRandomDistribution}
              onChange={(e) => {
                setDistributionConfig(prev => ({
                  ...prev,
                  isRandomDistribution: e.target.checked
                }));
              }}
            />
            Distribute tokens randomly
          </label>
          <div className="checkbox-description">
            {distributionConfig.isRandomDistribution 
              ? "Tokens will be distributed in random amounts while maintaining the total"
              : "Tokens will be distributed equally to all wallets"
            }
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
          onClick={() => {
            console.log('Distribution config:', distributionConfig);
          }}
        >
          {calculateTotalFees() > walletInfo.solBalance 
            ? 'Insufficient SOL for fees'
            : 'Start Distribution'
          }
        </button>
      </div>

      <button onClick={fetchWalletBalances}>Refresh Balances</button>
    </div>
  );
};

export default TokenDistributor; 