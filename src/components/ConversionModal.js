import React, { useState, useMemo } from 'react';
import { 
  Connection, 
  Transaction, 
  PublicKey, 
  SystemProgram, 
  TransactionInstruction, 
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  createAssociatedTokenAccountInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAccount
} from '@solana/spl-token';
import './ConversionModal.css';
import BN from 'bn.js';

const TRIBIFY_TOKEN_MINT = new PublicKey("672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump");
const PUMP_LP_ADDRESS = new PublicKey('6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7');
const PUMP_PROGRAM_ID = new PublicKey('PuMpFhQoAMRPFhQoAMRPFhQoAMRPFhQoAMRP'); // Need actual Pump.fun program ID

const SWAP_INSTRUCTION_LAYOUT = {
  SWAP: 9, // Raydium swap instruction discriminator
  SWAP_BASE_IN: 1,
  SWAP_BASE_OUT: 2
};

const ConversionModal = ({ 
  walletBalances,
  fromToken,
  toToken,
  onClose,
  onComplete 
}) => {
  const [status, setStatus] = useState({
    step: null,
    error: null,
    inProgress: false,
    loading: true
  });

  const totalAmount = useMemo(() => {
    if (!walletBalances) return 0;
    
    const amount = Object.entries(walletBalances)
      .filter(([key]) => key !== 'parent')
      .reduce((sum, [_, balance]) => sum + (balance[fromToken.toLowerCase()] || 0), 0);
    
    setStatus(prev => ({ ...prev, loading: false }));
    return amount;
  }, [walletBalances, fromToken]);

  const connection = new Connection(
    `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
    'confirmed'
  );

  const createWrapSolInstruction = async (userPublicKey, amount) => {
    const wsolAccount = await getAssociatedTokenAddress(
      NATIVE_MINT,
      userPublicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const instructions = [];

    // Create wSOL account if it doesn't exist
    try {
      await getAccount(connection, wsolAccount);
    } catch (error) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          userPublicKey,
          wsolAccount,
          userPublicKey,
          NATIVE_MINT
        )
      );
    }

    // Transfer SOL to get wSOL
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: wsolAccount,
        lamports: amount * LAMPORTS_PER_SOL
      }),
      createSyncNativeInstruction(wsolAccount)
    );

    return { instructions, wsolAccount };
  };

  const createUnwrapSolInstruction = (wsolAccount, userPublicKey) => {
    return createCloseAccountInstruction(
      wsolAccount,
      userPublicKey,
      userPublicKey
    );
  };

  const handleSwap = async () => {
    try {
      setStatus({ step: 'preparing', inProgress: true });
      
      if (totalAmount <= 0) {
        alert(`No ${fromToken} available to convert`);
        onClose();
        return;
      }

      const userPublicKey = window.phantom.solana.publicKey;
      const transaction = new Transaction();

      // Handle SOL wrapping/unwrapping and get correct token accounts
      let fromTokenAccount, toTokenAccount;
      
      if (fromToken === 'SOL') {
        // Wrap SOL first
        const { instructions, wsolAccount } = await createWrapSolInstruction(userPublicKey, totalAmount);
        instructions.forEach(ix => transaction.add(ix));
        fromTokenAccount = wsolAccount;
        
        toTokenAccount = await getAssociatedTokenAddress(
          TRIBIFY_TOKEN_MINT,
          userPublicKey,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
      } else {
        // TRIBIFY to SOL
        fromTokenAccount = await getAssociatedTokenAddress(
          TRIBIFY_TOKEN_MINT,
          userPublicKey,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        
        const { wsolAccount } = await createWrapSolInstruction(userPublicKey, 0);
        toTokenAccount = wsolAccount;
      }

      // Create Pump.fun swap instruction
      const swapInstruction = new TransactionInstruction({
        programId: PUMP_PROGRAM_ID,
        keys: [
          { pubkey: userPublicKey, isSigner: true, isWritable: true },
          { pubkey: PUMP_LP_ADDRESS, isSigner: false, isWritable: true },
          { pubkey: fromTokenAccount, isSigner: false, isWritable: true },
          { pubkey: toTokenAccount, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        data: Buffer.from([
          1, // Swap instruction
          ...Buffer.from(totalAmount.toString()) // Amount as string bytes
        ])
      });

      transaction.add(swapInstruction);

      // If swapping to SOL, add unwrap instruction
      if (toToken === 'SOL') {
        transaction.add(createUnwrapSolInstruction(toTokenAccount, userPublicKey));
      }

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPublicKey;

      setStatus({ step: 'approval', inProgress: true });
      const signed = await window.phantom.solana.signTransaction(transaction);
      
      setStatus({ step: 'processing', inProgress: true });
      const signature = await connection.sendRawTransaction(signed.serialize());
      
      setStatus({ step: 'complete', inProgress: false });
      onComplete();
      setTimeout(onClose, 2000);

    } catch (error) {
      console.error('Swap failed:', error);
      if (error.logs) {
        console.error('Transaction logs:', error.logs);
      }
      setStatus({ 
        step: null, 
        error: error.message,
        inProgress: false 
      });
    }
  };

  const handleClick = async () => {
    setStatus({ step: 'preparing' });
    await handleSwap();
  };

  return (
    <div className="modal-container">
      <div className="modal-overlay" onClick={() => !status.inProgress && onClose()} />
      <div className="modal-content conversion-modal">
        <div className="modal-header">
          <h3>Converting {fromToken} to {toToken}</h3>
          {!status.inProgress && (
            <button className="close-modal-button" onClick={onClose}>×</button>
          )}
        </div>
        
        <div className="modal-body">
          <div className="conversion-details">
            {status.loading ? (
              <div className="loading-state">
                <p>Calculating available amount...</p>
              </div>
            ) : (
              <>
                <div className="amount-display">
                  <span className="label">Amount to Convert:</span>
                  <span className="value">{totalAmount.toLocaleString()} {fromToken}</span>
                </div>
                
                <div className="steps-container">
                  <div className={`step ${status.step === 'preparing' ? 'active' : ''}`}>
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <h4>Preparing Transaction</h4>
                      <p>Calculating swap details...</p>
                    </div>
                  </div>

                  <div className={`step ${status.step === 'approval' ? 'active' : ''}`}>
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <h4>Wallet Approval</h4>
                      <p>Please approve the transaction in Phantom</p>
                    </div>
                  </div>

                  <div className={`step ${status.step === 'processing' ? 'active' : ''}`}>
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h4>Processing</h4>
                      <p>Confirming on blockchain...</p>
                    </div>
                  </div>
                </div>

                {status.error && (
                  <div className="error-message">
                    {status.error}
                    <button className="retry-button" onClick={handleClick}>
                      Try Again
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="modal-footer">
          {!status.loading && !status.inProgress && !status.error && (
            <button 
              className="convert-button" 
              onClick={handleClick}
              disabled={totalAmount <= 0}
            >
              {totalAmount <= 0 ? 'No Amount Available' : 'Start Conversion'}
            </button>
          )}
          {status.inProgress && (
            <button className="cancel-button" onClick={() => {
              if (window.confirm('Are you sure you want to cancel?')) {
                setStatus({ step: null, error: 'Cancelled by user' });
              }
            }}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversionModal; 