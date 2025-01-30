import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

export default async function handler(req, res) {
  console.log('=== API CALLED ===');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Has treasury key:', !!process.env.TREASURY_PRIVATE_KEY);
  console.log('Has Helius key:', !!process.env.REACT_APP_HELIUS_KEY);

  // Check request method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Log the full request
    console.log('Request body:', req.body);
    
    const { recipient, amount } = req.body;
    if (!recipient || !amount) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: { recipient, amount }
      });
    }

    // Initialize connection
    console.log('Connecting to Helius...');
    const connection = new Connection(
      `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
      'confirmed'
    );

    // Set up treasury wallet
    console.log('Setting up treasury...');
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

    return res.status(200).json({
      signature,
      message: `Successfully sent ${amount} $TRIBIFY to ${recipient}`
    });
  } catch (error) {
    // Better error logging
    console.error('=== TOKEN DISTRIBUTION FAILED ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    return res.status(500).json({
      error: error.message,
      type: error.constructor.name,
      stack: error.stack
    });
  }
} 