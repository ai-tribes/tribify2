import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { recipient, amount } = req.body;

    // Connect to Solana
    const connection = new Connection(
      `https://rpc.helius.xyz/?api-key=${process.env.HELIUS_KEY}`,
      'confirmed'
    );

    // Treasury wallet (from your private key in env)
    const treasuryKeypair = /* load from env */;
    
    // Token mint
    const mintPubkey = new PublicKey('672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump');
    
    // Get or create recipient's token account
    const recipientPubkey = new PublicKey(recipient);
    const associatedTokenAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mintPubkey,
      recipientPubkey
    );

    // Create token transfer instruction
    const transaction = new Transaction().add(
      Token.createTransferInstruction(
        TOKEN_PROGRAM_ID,
        treasuryTokenAccount,
        associatedTokenAccount,
        treasuryKeypair.publicKey,
        [],
        amount * 1000000 // Convert to raw amount
      )
    );

    // Send and confirm transaction
    await sendAndConfirmTransaction(
      connection,
      transaction,
      [treasuryKeypair]
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Token transfer failed:', error);
    res.status(500).json({ error: 'Token transfer failed' });
  }
} 