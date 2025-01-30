import { VersionedTransaction } from '@solana/web3.js';

export const createTradeTransaction = async (params) => {
  try {
    const response = await fetch('https://pumpportal.fun/api/trade-local', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        publicKey: params.publicKey,
        action: params.action,         // "buy" or "sell"
        mint: '672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump',
        amount: params.amount,         // amount to trade
        denominatedInSol: params.inSol,// true if amount is in SOL
        slippage: params.slippage || 10,
        priorityFee: params.priorityFee || 0.005,
        pool: 'pump'
      })
    });

    if (!response.ok) {
      throw new Error(`Trade API error: ${response.statusText}`);
    }

    // Get the serialized transaction
    const serializedTx = await response.arrayBuffer();
    
    // Create VersionedTransaction from the bytes
    const tx = VersionedTransaction.deserialize(new Uint8Array(serializedTx));
    
    return tx;
  } catch (error) {
    console.error('Failed to create trade transaction:', error);
    throw error;
  }
}; 