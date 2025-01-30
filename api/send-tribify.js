import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

export default async function handler(req, res) {
  try {
    const { recipient, amount } = req.body;
    console.log('Token distribution request:', { recipient, amount });

    // Initialize connection
    const connection = new Connection(
      `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
      'confirmed'
    );

    // Set up treasury wallet
    const treasuryKey = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(process.env.TREASURY_PRIVATE_KEY))
    );
    console.log('Treasury wallet ready:', treasuryKey.publicKey.toString());

    // Initialize token
    const mintPubkey = new PublicKey('672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump');
    const recipientPubkey = new PublicKey(recipient);

    // Get or create token accounts
    const recipientATA = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mintPubkey,
      recipientPubkey
    );

    const treasuryATA = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mintPubkey,
      treasuryKey.publicKey
    );

    console.log('Token accounts:', {
      recipient: recipientATA.toString(),
      treasury: treasuryATA.toString()
    });

    // Create token instance
    const token = new Token(
      connection,
      mintPubkey,
      TOKEN_PROGRAM_ID,
      treasuryKey
    );

    // Send tokens
    const signature = await token.transfer(
      treasuryATA,
      recipientATA,
      treasuryKey,
      [],
      amount * Math.pow(10, 9)
    );

    console.log('Transfer complete:', signature);

    return res.status(200).json({
      signature,
      message: `Successfully sent ${amount} $TRIBIFY to ${recipient}`
    });
  } catch (error) {
    console.error('Token distribution failed:', error);
    return res.status(500).json({
      error: error.message,
      details: error.stack
    });
  }
} 