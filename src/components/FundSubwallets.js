import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import './SolRecovery.css';

const getConnection = () => {
  return new Connection(
    `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
    {
      commitment: 'confirmed',
      wsEndpoint: undefined,
      confirmTransactionInitialTimeout: 60000
    }
  );
};

const FundSubwallets = ({ parentWallet, subwallets, onComplete, refreshBalances }) => {
  const [fundingState, setFundingState] = useState({
    amountPerWallet: 0.002,
    numberOfWallets: 1,
    parentSolBalance: 0,
    isRecovering: false,
    recoveredAmount: 0,
    isRandomDistribution: false,
    minAmount: 0.002,
    maxAmount: 0.01,
    isFunding: false,
    fundedCount: 0,
    currentBatch: [],
    successfulWallets: [],
    failedWallets: [],
    recoveryProgress: 0,
    recoveryBatch: [],
    successfulRecoveries: [],
    failedRecoveries: [],
    showRecoveryModal: false,
    walletStates: {},
    scanProgress: 0,
    isScanning: false
  });

  useEffect(() => {
    const fetchParentSOLBalance = async () => {
      try {
        const connection = getConnection();
        const balance = await connection.getBalance(
          new PublicKey(parentWallet.publicKey.toString())
        );
        setFundingState(prev => ({ 
          ...prev, 
          parentSolBalance: balance / LAMPORTS_PER_SOL 
        }));
      } catch (error) {
        console.error('Error fetching parent SOL balance:', error);
      }
    };

    fetchParentSOLBalance();
  }, [parentWallet]);

  const fundAllWallets = async () => {
    try {
      const connection = getConnection();
      const maxNeeded = fundingState.isRandomDistribution ? 
        fundingState.maxAmount * fundingState.numberOfWallets :
        fundingState.amountPerWallet * fundingState.numberOfWallets;
      
      const confirmed = window.confirm(
        `This will send ${fundingState.isRandomDistribution ? 
          `random amounts between ${fundingState.minAmount} and ${fundingState.maxAmount}` :
          fundingState.amountPerWallet
        } SOL to ${fundingState.numberOfWallets} subwallets.\n\n` +
        `Maximum Total: ${maxNeeded.toFixed(4)} SOL\n\n` +
        `Continue?`
      );

      if (!confirmed) return;

      setFundingState(prev => ({ 
        ...prev, 
        isFunding: true,
        currentBatch: [],
        successfulWallets: [],
        failedWallets: []
      }));

      const BATCH_SIZE = 4;
      for (let i = 0; i < fundingState.numberOfWallets; i += BATCH_SIZE) {
        const batch = subwallets.slice(i, Math.min(i + BATCH_SIZE, fundingState.numberOfWallets));
        
        setFundingState(prev => ({ 
          ...prev, 
          currentBatch: batch.map(w => w.publicKey.toString())
        }));

        const transaction = new Transaction();
        
        batch.forEach(wallet => {
          const amount = fundingState.isRandomDistribution ?
            Math.random() * (fundingState.maxAmount - fundingState.minAmount) + fundingState.minAmount :
            fundingState.amountPerWallet;

          transaction.add(
            SystemProgram.transfer({
              fromPubkey: new PublicKey(parentWallet.publicKey.toString()),
              toPubkey: wallet.publicKey,
              lamports: Math.floor(amount * LAMPORTS_PER_SOL)
            })
          );
        });

        try {
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = new PublicKey(parentWallet.publicKey.toString());

          const signed = await parentWallet.signTransaction(transaction);
          const signature = await connection.sendRawTransaction(signed.serialize());
          await connection.confirmTransaction(signature);

          setFundingState(prev => ({
            ...prev,
            successfulWallets: [...prev.successfulWallets, ...batch.map(w => w.publicKey.toString())],
            fundedCount: Math.min((prev.fundedCount || 0) + batch.length, fundingState.numberOfWallets)
          }));

          await refreshBalances();

        } catch (error) {
          console.error('Batch funding failed:', error);
          setFundingState(prev => ({
            ...prev,
            failedWallets: [...prev.failedWallets, ...batch.map(w => w.publicKey.toString())]
          }));
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      alert('Successfully funded wallets!');
      onComplete();
    } catch (error) {
      console.error('Error funding wallets:', error);
      alert(`Failed to fund wallets: ${error.message}`);
    } finally {
      setFundingState(prev => ({ 
        ...prev, 
        isFunding: false,
        fundedCount: 0,
        currentBatch: []
      }));
    }
  };

  const recoverExcessSol = async (closeATAs = false) => {
    try {
      const connection = getConnection();
      setFundingState(prev => ({ 
        ...prev, 
        isRecovering: true,
        recoveredAmount: 0,
        recoveryProgress: 0,
        recoveryBatch: [],
        successfulRecoveries: [],
        failedRecoveries: []
      }));

      const ATA_MINIMUM = 0.002 * LAMPORTS_PER_SOL; // Minimum SOL needed for ATA
      const BATCH_SIZE = 4;
      let totalRecovered = 0;
      let walletsWithExcess = 0;

      // Check all subwallets in batches
      for (let i = 0; i < subwallets.length; i += BATCH_SIZE) {
        const batch = subwallets.slice(i, Math.min(i + BATCH_SIZE, subwallets.length));
        setFundingState(prev => ({ ...prev, recoveryBatch: batch.map(w => w.publicKey.toString()) }));

        await Promise.all(batch.map(async (wallet) => {
          try {
            const balance = await connection.getBalance(wallet.publicKey);
            console.log(`Wallet ${wallet.publicKey.toString()}: ${balance / LAMPORTS_PER_SOL} SOL`);
            
            if (balance > ATA_MINIMUM) {
              walletsWithExcess++;
              const amountToRecover = balance - ATA_MINIMUM;
              console.log(`Recovering ${amountToRecover / LAMPORTS_PER_SOL} SOL from ${wallet.publicKey.toString()}`);
              
              const transaction = new Transaction().add(
                SystemProgram.transfer({
                  fromPubkey: wallet.publicKey,
                  toPubkey: new PublicKey(parentWallet.publicKey.toString()),
                  lamports: amountToRecover
                })
              );

              const { blockhash } = await connection.getLatestBlockhash();
              transaction.recentBlockhash = blockhash;
              transaction.feePayer = wallet.publicKey;

              const keypair = Keypair.fromSecretKey(new Uint8Array(wallet.secretKey));
              transaction.sign(keypair);

              const signature = await connection.sendRawTransaction(transaction.serialize());
              await connection.confirmTransaction(signature);

              totalRecovered += amountToRecover;
              setFundingState(prev => ({
                ...prev,
                recoveredAmount: totalRecovered / LAMPORTS_PER_SOL,
                successfulRecoveries: [...prev.successfulRecoveries, wallet.publicKey.toString()]
              }));
            }
            
          } catch (error) {
            console.error(`Failed to recover from wallet ${wallet.publicKey.toString()}:`, error);
            setFundingState(prev => ({
              ...prev,
              failedRecoveries: [...prev.failedRecoveries, wallet.publicKey.toString()]
            }));
          }
        }));

        setFundingState(prev => ({ 
          ...prev, 
          recoveryProgress: Math.min(i + BATCH_SIZE, subwallets.length) 
        }));

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (totalRecovered > 0) {
        await refreshBalances();
        alert(`Successfully recovered ${(totalRecovered / LAMPORTS_PER_SOL).toFixed(4)} SOL from ${walletsWithExcess} wallets`);
      } else {
        alert(`Checked ${subwallets.length} wallets. Found ${walletsWithExcess} with excess SOL. Nothing to recover.`);
      }

    } catch (error) {
      console.error('Recovery failed:', error);
      alert(`Recovery failed: ${error.message}`);
    } finally {
      setFundingState(prev => ({ ...prev, isRecovering: false }));
    }
  };

  const scanWalletBalances = async () => {
    const connection = getConnection();
    const ATA_MINIMUM = 0.002 * LAMPORTS_PER_SOL;
    
    setFundingState(prev => ({ 
      ...prev, 
      isScanning: true,
      scanProgress: 0,
      walletStates: {}
    }));

    for (let i = 0; i < subwallets.length; i++) {
      const wallet = subwallets[i];
      try {
        const balance = await connection.getBalance(wallet.publicKey);
        
        let state = 'empty';
        if (balance === 0) {
          state = 'empty';
        } else if (balance === ATA_MINIMUM) {
          state = 'ata';
        } else if (balance > ATA_MINIMUM) {
          state = 'excess';
        }

        setFundingState(prev => ({
          ...prev,
          walletStates: {
            ...prev.walletStates,
            [wallet.publicKey.toString()]: {
              state,
              balance: balance / LAMPORTS_PER_SOL
            }
          },
          scanProgress: (i + 1)
        }));

      } catch (error) {
        console.error(`Error scanning wallet ${wallet.publicKey.toString()}:`, error);
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setFundingState(prev => ({ ...prev, isScanning: false }));
  };

  return (
    <>
      <div className="modal-left">
        <h2 className="fund-modal-title">Fund SubWallets</h2>
        <div className="config-explanation">
          <div className="explanation-section">
            <h3>Funding Process</h3>
            <ul>
              <li>Set SOL amount to send to each subwallet</li>
              <li>Review total SOL needed for all subwallets</li>
              <li>Transactions are processed in batches of 4</li>
              <li>One signature funds multiple wallets</li>
            </ul>
          </div>

          <div className="explanation-section">
            <h3>Cost Breakdown</h3>
            <ul>
              <li>ATA Creation: 0.002 SOL per wallet</li>
              <li>Transaction Fee: 0.000005 SOL per operation</li>
              <li>Funding Amount: Your chosen amount per wallet</li>
            </ul>
            <div className="cost-example">
              <p>Example for 10 wallets with 0.01 SOL each:</p>
              <ul>
                <li>ATAs: 10 × 0.002 = 0.02 SOL</li>
                <li>TX Fees: ≈ 0.0001 SOL</li>
                <li>Funding: 10 × 0.01 = 0.1 SOL</li>
                <li>Total: ≈ 0.1201 SOL</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="modal-right">
        <div className="funding-container">
          <div className="parent-sol-balance">
            <span>Parent Wallet SOL Balance:</span>
            <span className="balance">{fundingState.parentSolBalance.toFixed(4)} SOL</span>
            <button 
              className="refresh-button"
              onClick={async () => {
                try {
                  const connection = getConnection();
                  const balance = await connection.getBalance(
                    new PublicKey(parentWallet.publicKey.toString())
                  );
                  setFundingState(prev => ({ 
                    ...prev, 
                    parentSolBalance: balance / LAMPORTS_PER_SOL 
                  }));
                } catch (error) {
                  console.error('Error fetching SOL balance:', error);
                  alert('Failed to fetch SOL balance. Please try again.');
                }
              }}
            >
              Refresh
            </button>
          </div>

          <div className="funding-section">
            <h4>Fund Subwallets</h4>
            <div className="funding-controls">
              <div className="wallet-selection">
                <label>Number of wallets to fund:</label>
                <input 
                  type="number"
                  value={fundingState.numberOfWallets}
                  onChange={(e) => {
                    const value = Math.min(Math.max(1, parseInt(e.target.value)), subwallets.length);
                    setFundingState(prev => ({ 
                      ...prev, 
                      numberOfWallets: value 
                    }));
                  }}
                  min="1"
                  max={subwallets.length}
                />
                <span className="max-wallets">Max: {subwallets.length}</span>
              </div>

              <div className="distribution-type">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={fundingState.isRandomDistribution}
                    onChange={(e) => setFundingState(prev => ({
                      ...prev,
                      isRandomDistribution: e.target.checked
                    }))}
                  />
                  Random Distribution
                </label>
                <div className="checkbox-description">
                  Distribute random amounts between min and max values
                </div>
              </div>

              {fundingState.isRandomDistribution ? (
                <div className="amount-range">
                  <div className="amount-input">
                    <label>Minimum Amount (SOL):</label>
                    <input 
                      type="number"
                      value={fundingState.minAmount}
                      onChange={(e) => setFundingState(prev => ({ 
                        ...prev, 
                        minAmount: parseFloat(e.target.value),
                        maxAmount: Math.max(parseFloat(e.target.value), prev.maxAmount)
                      }))}
                      min="0.001"
                      step="0.001"
                    />
                  </div>
                  <div className="amount-input">
                    <label>Maximum Amount (SOL):</label>
                    <input 
                      type="number"
                      value={fundingState.maxAmount}
                      onChange={(e) => setFundingState(prev => ({ 
                        ...prev, 
                        maxAmount: parseFloat(e.target.value),
                        minAmount: Math.min(parseFloat(e.target.value), prev.minAmount)
                      }))}
                      min="0.001"
                      step="0.001"
                    />
                  </div>
                </div>
              ) : (
                <div className="amount-input">
                  <label>Amount per wallet (SOL):</label>
                  <input 
                    type="number"
                    value={fundingState.amountPerWallet}
                    onChange={(e) => setFundingState(prev => ({ 
                      ...prev, 
                      amountPerWallet: parseFloat(e.target.value) 
                    }))}
                    min="0.001"
                    step="0.001"
                  />
                </div>
              )}

              <div className="cost-breakdown">
                <div className="cost-item">
                  <span>ATA Creation:</span>
                  <span>{(0.002 * fundingState.numberOfWallets).toFixed(4)} SOL</span>
                </div>
                <div className="cost-item">
                  <span>Transaction Fees:</span>
                  <span>{(0.000005 * Math.ceil(fundingState.numberOfWallets / 4)).toFixed(6)} SOL</span>
                </div>
                <div className="cost-item">
                  <span>Funding Amount:</span>
                  <span>{fundingState.isRandomDistribution ? 
                    `${(fundingState.minAmount * fundingState.numberOfWallets).toFixed(4)} - ${(fundingState.maxAmount * fundingState.numberOfWallets).toFixed(4)}` :
                    (fundingState.amountPerWallet * fundingState.numberOfWallets).toFixed(4)
                  } SOL</span>
                </div>
                <div className="cost-item total">
                  <span>Maximum SOL needed:</span>
                  <span>{(
                    0.002 * fundingState.numberOfWallets + 
                    0.000005 * Math.ceil(fundingState.numberOfWallets / 4) + 
                    (fundingState.isRandomDistribution ? 
                      fundingState.maxAmount * fundingState.numberOfWallets :
                      fundingState.amountPerWallet * fundingState.numberOfWallets)
                  ).toFixed(4)} SOL</span>
                </div>
              </div>

              <button 
                className="execute-funding-button"
                disabled={
                  fundingState.isFunding || 
                  (0.002 * fundingState.numberOfWallets + 
                   0.000005 * Math.ceil(fundingState.numberOfWallets / 4) + 
                   fundingState.amountPerWallet * fundingState.numberOfWallets) > fundingState.parentSolBalance
                }
                onClick={fundAllWallets}
              >
                {fundingState.isFunding ? (
                  <span>
                    <span className="loading-spinner">↻</span>
                    Funding ({fundingState.fundedCount || 0}/{fundingState.numberOfWallets})
                  </span>
                ) : (
                  'Fund with SOL'
                )}
              </button>

              <button 
                className="recover-sol-button"
                onClick={() => setFundingState(prev => ({ ...prev, showRecoveryModal: true }))}
              >
                Recover SOL
              </button>
            </div>

            {fundingState.isFunding && (
              <div className="funding-progress">
                <h4>Funding Progress</h4>
                <div className="current-batch">
                  {fundingState.currentBatch.map((wallet, index) => (
                    <div key={index} className={`batch-wallet ${
                      fundingState.successfulWallets.includes(wallet) ? 'success' :
                      fundingState.failedWallets.includes(wallet) ? 'failed' : 'processing'
                    }`}>
                      <span className="wallet-address">{wallet.slice(0, 6)}...{wallet.slice(-6)}</span>
                      <span className="status">
                        {fundingState.successfulWallets.includes(wallet) ? '✓' :
                         fundingState.failedWallets.includes(wallet) ? '✗' : '...'}</span>
                    </div>
                  ))}
                </div>
                <div className="funding-stats">
                  <div>Successfully Funded: {fundingState.successfulWallets.length}</div>
                  <div>Failed: {fundingState.failedWallets.length}</div>
                </div>
              </div>
            )}

            {fundingState.isRecovering && (
              <div className="funding-progress">
                <h4>Recovery Progress</h4>
                <div className="current-batch">
                  {fundingState.recoveryBatch.map((wallet, index) => (
                    <div key={index} className={`batch-wallet ${
                      fundingState.successfulRecoveries.includes(wallet) ? 'success' :
                      fundingState.failedRecoveries.includes(wallet) ? 'failed' : 'processing'
                    }`}>
                      <span className="wallet-address">{wallet.slice(0, 6)}...{wallet.slice(-6)}</span>
                      <span className="status">
                        {fundingState.successfulRecoveries.includes(wallet) ? '✓' :
                         fundingState.failedRecoveries.includes(wallet) ? '✗' : '...'}</span>
                    </div>
                  ))}
                </div>
                <div className="funding-stats">
                  <div>Successfully Processed: {fundingState.successfulRecoveries.length}</div>
                  <div>Failed: {fundingState.failedRecoveries.length}</div>
                  <div>Total Recovered: {fundingState.recoveredAmount.toFixed(4)} SOL</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {fundingState.showRecoveryModal && (
        <div className="modal-overlay">
          <div className="sol-recovery-modal">
            <div className="sol-recovery-header">
              <h2>SOL Recovery</h2>
              <button 
                className="sol-recovery-close"
                onClick={() => setFundingState(prev => ({ ...prev, showRecoveryModal: false }))}
              >×</button>
            </div>

            <div className="sol-recovery-actions">
              <button 
                className="scan-button"
                disabled={fundingState.isScanning}
                onClick={scanWalletBalances}
              >
                {fundingState.isScanning ? 'Scanning...' : 'Scan Wallets'}
              </button>
              
              <div className="recovery-buttons">
                <button 
                  className="recover-excess-button"
                  disabled={!Object.values(fundingState.walletStates).some(w => w.state === 'excess')}
                  onClick={() => recoverExcessSol(false)}
                >
                  Recover Excess SOL
                </button>
                <button 
                  className="close-atas-button"
                  disabled={!Object.values(fundingState.walletStates).some(w => w.state === 'ata' || w.state === 'excess')}
                  onClick={() => recoverExcessSol(true)}
                >
                  Close ATAs & Recover All
                </button>
              </div>
            </div>

            <div className="wallets-grid">
              {subwallets.map((wallet) => {
                const walletState = fundingState.walletStates[wallet.publicKey.toString()];
                return (
                  <div 
                    key={wallet.publicKey.toString()}
                    className={`wallet-cell ${walletState?.state || 'unscanned'}`}
                  >
                    <div className="address">
                      {wallet.publicKey.toString().slice(0, 4)}...{wallet.publicKey.toString().slice(-4)}
                    </div>
                    {walletState && (
                      <div className="balance">
                        {walletState.balance.toFixed(4)} SOL
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {fundingState.isScanning && (
              <div className="scan-progress">
                Scanning: {fundingState.scanProgress} / {subwallets.length}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FundSubwallets; 