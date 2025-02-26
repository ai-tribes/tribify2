import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TREASURY_WALLET } from './wallet';

// Constants
export const FRIEND_WALLETS = {
  'Aycm5thyEQXMFR6CNVKL5f6SRJ3KVTCGA3HYoRTHN2kN': 'your_secret_password'
};

/**
 * Save friend password to local storage
 * 
 * @param {string} password - Password to save
 */
export const saveFriendPassword = (password) => {
  localStorage.setItem('friend_password', password);
};

/**
 * Get friend password from local storage
 * 
 * @returns {string|null} Saved password or null if not found
 */
export const getFriendPassword = () => {
  return localStorage.getItem('friend_password');
};

/**
 * Remove friend password from local storage
 */
export const removeFriendPassword = () => {
  localStorage.removeItem('friend_password');
};

/**
 * Check if a wallet is a known friend wallet
 * 
 * @param {string} walletAddress - Wallet address to check
 * @returns {boolean} True if the wallet is a friend wallet
 */
export const isFriendWallet = (walletAddress) => {
  return !!FRIEND_WALLETS[walletAddress];
};

/**
 * Verify friend password for a wallet
 * 
 * @param {string} walletAddress - Wallet address
 * @param {string} password - Password to verify
 * @returns {boolean} True if password is correct
 */
export const verifyFriendPassword = (walletAddress, password) => {
  return FRIEND_WALLETS[walletAddress] === password;
};

/**
 * Change friend password (requires transaction payment)
 * 
 * @param {string} publicKey - User's public key
 * @param {string} newPassword - New password
 * @param {Object} connection - Solana connection
 * @returns {Promise<boolean>} Success status
 */
export const changeFriendPassword = async (publicKey, newPassword, connection) => {
  try {
    // Payment for password change (0.001 SOL)
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(publicKey),
        toPubkey: new PublicKey(TREASURY_WALLET),
        lamports: LAMPORTS_PER_SOL * 0.001
      })
    );

    const { blockhash } = await connection.getLatestBlockhash('processed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(publicKey);
    
    const signed = await window.phantom.solana.signTransaction(transaction);
    await connection.sendRawTransaction(signed.serialize());

    // Save new password
    saveFriendPassword(newPassword);
    
    return true;
  } catch (error) {
    console.error('Error changing password:', error);
    return false;
  }
};

/**
 * Check if the user's wallet is connected
 * 
 * @returns {Promise<boolean>} True if wallet is connected
 */
export const isWalletConnected = async () => {
  try {
    if (!window.phantom?.solana?.isPhantom) return false;
    return window.phantom.solana.isConnected;
  } catch (error) {
    console.error('Error checking wallet connection:', error);
    return false;
  }
};

/**
 * Backup user's nicknames for contacts
 * 
 * @param {Object} nicknames - Nicknames object to backup
 */
export const backupNicknames = (nicknames) => {
  if (!nicknames) return;
  
  const blob = new Blob([JSON.stringify(nicknames)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `tribify-nicknames-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
};

/**
 * Restore user's nicknames from a backup file
 * 
 * @param {File} file - Backup file
 * @returns {Promise<Object|null>} Restored nicknames or null on error
 */
export const restoreNicknames = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const nicknames = JSON.parse(event.target.result);
        resolve(nicknames);
      } catch (error) {
        console.error('Error parsing nicknames file:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error('Error reading nicknames file:', error);
      reject(error);
    };
    
    reader.readAsText(file);
  });
};

/**
 * Sign a message to verify wallet ownership
 * 
 * @param {string} message - Message to sign
 * @returns {Promise<{signature: string, publicKey: string}>} Signature and public key
 */
export const signMessage = async (message) => {
  if (!window.phantom?.solana?.isConnected) {
    throw new Error('Wallet not connected');
  }
  
  const encodedMessage = new TextEncoder().encode(message);
  
  try {
    const signedMessage = await window.phantom.solana.signMessage(
      encodedMessage,
      'utf8'
    );
    
    return {
      signature: signedMessage.signature,
      publicKey: signedMessage.publicKey.toString()
    };
  } catch (error) {
    console.error('Error signing message:', error);
    throw error;
  }
}; 