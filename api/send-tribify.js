const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  createTransferInstruction 
} = require('@solana/spl-token');
const bs58 = require('bs58');
const { Transaction } = require('@solana/web3.js');

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
      const privateKeyString = process.env.TREASURY_PRIVATE_KEY;
      console.log('Private key format:', {
        length: privateKeyString?.length,
        startsWith: privateKeyString?.substring(0, 20),
        isString: typeof privateKeyString === 'string'
      });

      // Just try base58 decode - it's the most common format
      const treasuryKey = Keypair.fromSecretKey(
        bs58.decode(privateKeyString)
      );
      console.log('Treasury wallet ready:', treasuryKey.publicKey.toString());

      // Initialize token
      const mintPubkey = new PublicKey('672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump');
      const recipientPubkey = new PublicKey(recipient);

      // Get token accounts and create if needed
      const recipientATA = await getAssociatedTokenAddress(
        mintPubkey,
        recipientPubkey
      );

      const treasuryATA = await getAssociatedTokenAddress(
        mintPubkey,
        treasuryKey.publicKey
      );

      // Build transaction
      const tx = new Transaction();

      // Add ATA creation instructions if needed
      try {
        await connection.getAccountInfo(recipientATA);
      } catch {
        tx.add(
          createAssociatedTokenAccountInstruction(
            treasuryKey.publicKey,  // payer
            recipientATA,           // ata
            recipientPubkey,        // owner
            mintPubkey              // mint
          )
        );
      }

      // Add transfer instruction
      tx.add(
        createTransferInstruction(
          treasuryATA,
          recipientATA,
          treasuryKey.publicKey,
          amount * Math.pow(10, 9)
        )
      );

      // Send transaction
      const signature = await connection.sendTransaction(tx, [treasuryKey]);

      return res.status(200).json({
        signature,
        message: `Successfully sent ${amount} $TRIBIFY to ${recipient}`
      });
    } catch (error) {
      console.error('Failed to parse treasury key:', error);
      console.error('Key string:', process.env.TREASURY_PRIVATE_KEY);
      throw new Error('Treasury key configuration error: ' + error.message);
    }
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