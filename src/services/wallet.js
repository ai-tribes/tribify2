import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import bs58 from 'bs58';

// Constants
export const TRIBIFY_TOKEN_MINT = "672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump";
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const TREASURY_WALLET = 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv';
export const MAX_WALLETS = 100;
export const ATA_MINIMUM_SOL = 0.002;
export const TX_FEE = 0.000005;

/**
 * Creates a connection to the Solana blockchain
 * 
 * @param {string} endpoint - Optional custom endpoint
 * @returns {Connection} Solana connection object
 */
export const createConnection = (endpoint) => {
  // Use endpoint if provided, otherwise use environment variable or fallback to mainnet
  const rpcUrl = endpoint || 
    (process.env.REACT_APP_HELIUS_KEY 
      ? `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`
      : 'https://api.mainnet-beta.solana.com');
  
  return new Connection(rpcUrl, {
    commitment: 'confirmed',
    wsEndpoint: undefined,
    confirmTransactionInitialTimeout: 60000
  });
};

/**
 * Connects to the Phantom wallet
 * 
 * @returns {Promise<{publicKey: string}>} The connected wallet's public key
 * @throws {Error} If Phantom is not installed or connection fails
 */
export const connectWallet = async () => {
  if (!window.phantom?.solana?.isPhantom) {
    throw new Error('Phantom wallet is not installed');
  }

  try {
    const resp = await window.phantom.solana.connect();
    return {
      publicKey: resp.publicKey.toString()
    };
  } catch (error) {
    console.error('Error connecting to wallet:', error);
    throw new Error('Failed to connect to wallet');
  }
};

/**
 * Disconnects from the Phantom wallet
 * 
 * @returns {Promise<void>}
 */
export const disconnectWallet = async () => {
  if (window.phantom?.solana?.isConnected) {
    await window.phantom.solana.disconnect();
  }
};

/**
 * Gets the SOL balance for a wallet
 * 
 * @param {string} publicKey - The wallet's public key
 * @param {Connection} connection - Solana connection
 * @returns {Promise<number>} Balance in SOL
 */
export const getSolBalance = async (publicKey, connection) => {
  try {
    const balance = await connection.getBalance(new PublicKey(publicKey));
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error getting SOL balance:', error);
    throw error;
  }
};

/**
 * Checks if a wallet has a token account for a specific token
 * 
 * @param {string} walletAddress - The wallet address
 * @param {string} tokenMint - The token mint address
 * @param {Connection} connection - Solana connection
 * @returns {Promise<boolean>} Whether the token account exists
 */
export const hasTokenAccount = async (walletAddress, tokenMint, connection) => {
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(walletAddress),
      { mint: new PublicKey(tokenMint) }
    );
    return tokenAccounts.value.length > 0;
  } catch (error) {
    console.error('Error checking token account:', error);
    return false;
  }
};

/**
 * Gets the token balance for a specific token
 * 
 * @param {string} walletAddress - The wallet address
 * @param {string} tokenMint - The token mint address
 * @param {Connection} connection - Solana connection
 * @returns {Promise<number>} Token balance
 */
export const getTokenBalance = async (walletAddress, tokenMint, connection) => {
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(walletAddress),
      { mint: new PublicKey(tokenMint) }
    );
    
    if (tokenAccounts.value.length === 0) {
      return 0;
    }
    
    return tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
  } catch (error) {
    console.error('Error getting token balance:', error);
    return 0;
  }
};

/**
 * Creates a new wallet (keypair)
 * 
 * @returns {{publicKey: string, privateKey: string}} The new wallet's keys
 */
export const createWallet = () => {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toString(),
    privateKey: bs58.encode(keypair.secretKey)
  };
};

/**
 * Creates multiple wallets
 * 
 * @param {number} count - Number of wallets to create
 * @returns {Array<{publicKey: string, privateKey: string}>} Array of wallet objects
 */
export const createWallets = (count) => {
  const wallets = [];
  for (let i = 0; i < count; i++) {
    wallets.push(createWallet());
  }
  return wallets;
};

/**
 * Gets multiple account balances in a batch operation
 * 
 * @param {Array<{publicKey: string, privateKey: string}>} wallets - Array of wallet objects
 * @param {Connection} connection - Solana connection
 * @returns {Promise<Array<{publicKey: string, privateKey: string, solBalance: number, tribifyBalance: number, usdcBalance: number}>>}
 */
export const fetchWalletBalances = async (wallets, connection) => {
  return Promise.all(wallets.map(async (wallet) => {
    try {
      // Fetch SOL balance
      const solBalance = await getSolBalance(wallet.publicKey, connection);
      
      // Fetch TRIBIFY balance
      const tribifyBalance = await getTokenBalance(wallet.publicKey, TRIBIFY_TOKEN_MINT, connection);
      
      // Fetch USDC balance
      const usdcBalance = await getTokenBalance(wallet.publicKey, USDC_MINT, connection);
      
      return {
        ...wallet,
        solBalance,
        tribifyBalance,
        usdcBalance
      };
    } catch (e) {
      console.error('Error fetching balance for wallet:', wallet.publicKey, e);
      return {
        ...wallet,
        solBalance: 0,
        tribifyBalance: 0,
        usdcBalance: 0
      };
    }
  }));
};

/**
 * Sends SOL from one wallet to another
 * 
 * @param {string} fromWallet - Sender's public key
 * @param {string} toWallet - Recipient's public key
 * @param {number} amount - Amount of SOL to send
 * @param {Connection} connection - Solana connection
 * @returns {Promise<string>} Transaction signature
 */
export const sendSol = async (fromWallet, toWallet, amount, connection) => {
  try {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(fromWallet),
        toPubkey: new PublicKey(toWallet),
        lamports: amount * LAMPORTS_PER_SOL
      })
    );

    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(fromWallet);

    const signed = await window.phantom.solana.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    
    return signature;
  } catch (error) {
    console.error('Error sending SOL:', error);
    throw error;
  }
}; 