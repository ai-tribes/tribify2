const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');

module.exports = async function handler(req, res) {
  console.log('=== API CALLED ===');
  console.log('Request method:', req.method);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Has treasury key:', !!process.env.TREASURY_PRIVATE_KEY);
  console.log('Has Helius key:', !!process.env.REACT_APP_HELIUS_KEY);

  // Better error for wrong method
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: `Method ${req.method} not allowed - use POST`,
      allowedMethods: ['POST']
    });
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
    try {
      // Try parsing if it's a JSON string
      const privateKeyString = process.env.TREASURY_PRIVATE_KEY;
      const privateKeyData = privateKeyString.startsWith('[') 
        ? JSON.parse(privateKeyString)  // If it's JSON array
        : privateKeyString.split(',');  // If it's comma-separated

      const treasuryKey = Keypair.fromSecretKey(
        Buffer.from(privateKeyData)
      );
      console.log('Treasury wallet ready:', treasuryKey.publicKey.toString());
    } catch (error) {
      console.error('Failed to parse treasury key:', error);
      throw new Error('Treasury key configuration error');
    }

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