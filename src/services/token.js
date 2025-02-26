import { PublicKey, Connection } from '@solana/web3.js';
import { TRIBIFY_TOKEN_MINT, USDC_MINT } from './wallet';

// Constants
export const TOTAL_SUPPLY = 1_000_000_000; // 1 Billion tokens
export const LP_ADDRESS = '6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7';
export const TREASURY_ADDRESS = 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv';

/**
 * Gets the color for a token holder based on their balance
 * 
 * @param {string} address - Token holder address
 * @param {number} tokenBalance - Token balance
 * @returns {string} Color code for the holder
 */
export const getHolderColor = (address, tokenBalance) => {
  if (address === LP_ADDRESS) {
    return '#87CEEB';  // Light blue for LP
  }
  const percentage = (tokenBalance / TOTAL_SUPPLY) * 100;
  if (percentage > 10) {
    return '#ff0000';  // Red for whales
  }
  if (percentage > 1) {
    return '#ffa500';  // Orange/yellow for medium holders
  }
  return '#2ecc71';  // Green for small holders
};

/**
 * Fetches all token holders for a token mint
 * 
 * @param {Connection} connection - Solana connection
 * @param {string} tokenMint - Token mint address
 * @returns {Promise<Array<{address: string, tokenBalance: number}>>} List of token holders with balances
 */
export const fetchTokenHolders = async (connection, tokenMint = TRIBIFY_TOKEN_MINT) => {
  try {
    const tokenMintPublicKey = new PublicKey(tokenMint);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') },
      { mint: tokenMintPublicKey }
    );
    
    // Transform token account data to holder data
    return tokenAccounts.value.map(account => {
      const parsedAccountInfo = account.account.data.parsed.info;
      const ownerAddress = parsedAccountInfo.owner;
      const tokenBalance = parsedAccountInfo.tokenAmount.uiAmount || 0;
      
      return {
        address: ownerAddress,
        tokenBalance,
      };
    }).filter(holder => holder.tokenBalance > 0);
  } catch (error) {
    console.error('Error fetching token holders:', error);
    return [];
  }
};

/**
 * Fetches treasury balances for multiple tokens
 * 
 * @param {Connection} connection - Solana connection
 * @param {string} treasuryAddress - Treasury wallet address
 * @returns {Promise<{sol: number, usdc: number, tribify: number}>} Treasury balances
 */
export const fetchTreasuryBalances = async (connection, treasuryAddress = TREASURY_ADDRESS) => {
  try {
    const treasuryPublicKey = new PublicKey(treasuryAddress);
    
    // Get SOL balance
    const solBalance = await connection.getBalance(treasuryPublicKey);
    const solAmount = solBalance / 1_000_000_000; // LAMPORTS_PER_SOL
    
    // Get TRIBIFY balance
    const tribifyMint = new PublicKey(TRIBIFY_TOKEN_MINT);
    const tribifyAccounts = await connection.getParsedTokenAccountsByOwner(
      treasuryPublicKey,
      { mint: tribifyMint }
    );
    let tribifyBalance = 0;
    if (tribifyAccounts.value.length > 0) {
      tribifyBalance = tribifyAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
    }
    
    // Get USDC balance
    const usdcMint = new PublicKey(USDC_MINT);
    const usdcAccounts = await connection.getParsedTokenAccountsByOwner(
      treasuryPublicKey,
      { mint: usdcMint }
    );
    let usdcBalance = 0;
    if (usdcAccounts.value.length > 0) {
      usdcBalance = usdcAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
    }
    
    return {
      sol: solAmount,
      usdc: usdcBalance,
      tribify: tribifyBalance
    };
  } catch (error) {
    console.error('Error fetching treasury balances:', error);
    return {
      sol: 0,
      usdc: 0,
      tribify: 0
    };
  }
};

/**
 * Generates graph data for token holders
 * 
 * @param {Array<{address: string, tokenBalance: number}>} holders - Token holders data
 * @param {Object} nicknames - Nickname mapping for addresses
 * @param {boolean} randomizePositions - Whether to randomize node positions
 * @returns {Object} Graph data with nodes and links
 */
export const generateHolderGraphData = (holders, nicknames = {}, randomizePositions = true) => {
  if (!holders || holders.length === 0) {
    return { nodes: [], links: [] };
  }

  // Generate nodes
  const nodes = holders.map((holder, index) => {
    const percentage = (holder.tokenBalance / TOTAL_SUPPLY) * 100;
    
    return {
      id: holder.address,
      name: nicknames[holder.address] || holder.address,
      val: Math.max(5, Math.sqrt(percentage) * 10), // Node size based on token percentage
      color: getHolderColor(holder.address, holder.tokenBalance),
      tokenBalance: holder.tokenBalance,
      percentage
    };
  });

  // Find treasury and LP nodes
  const treasuryNode = nodes.find(node => node.id === TREASURY_ADDRESS);
  const lpNode = nodes.find(node => node.id === LP_ADDRESS);
  
  // Generate links
  const links = [];
  
  // Connect treasury to LP
  if (treasuryNode && lpNode) {
    links.push({
      source: TREASURY_ADDRESS,
      target: LP_ADDRESS,
      value: 10,
      color: '#aaa'
    });
  }
  
  // Connect major holders (>1%) to treasury
  if (treasuryNode) {
    nodes.forEach(node => {
      if (node.percentage > 1 && node.id !== TREASURY_ADDRESS && node.id !== LP_ADDRESS) {
        links.push({
          source: TREASURY_ADDRESS,
          target: node.id,
          value: Math.min(5, node.percentage / 2),
          color: '#ddd'
        });
      }
    });
  }
  
  // Connect small holders to closest big holder or LP
  nodes.forEach(node => {
    if (node.percentage <= 1 && node.id !== TREASURY_ADDRESS && node.id !== LP_ADDRESS) {
      // Find closest big holder or default to LP
      const targetNode = lpNode ? lpNode.id : (treasuryNode ? treasuryNode.id : null);
      
      if (targetNode) {
        links.push({
          source: targetNode,
          target: node.id,
          value: 1,
          color: '#eee'
        });
      }
    }
  });
  
  return { nodes, links };
};

/**
 * Calculate token distribution statistics
 * 
 * @param {Array<{address: string, tokenBalance: number}>} holders - Token holders data
 * @returns {Object} Statistics about token distribution
 */
export const calculateTokenStats = (holders) => {
  if (!holders || holders.length === 0) {
    return {
      totalHolders: 0,
      totalCirculating: 0,
      averageHolding: 0,
      medianHolding: 0,
      largestHolder: null,
      smallestHolder: null,
      circulatingPercentage: 0
    };
  }
  
  const totalHolders = holders.length;
  
  // Calculate total and average
  const totalCirculating = holders.reduce((sum, holder) => sum + holder.tokenBalance, 0);
  const averageHolding = totalCirculating / totalHolders;
  
  // Find largest and smallest holders
  const sortedHolders = [...holders].sort((a, b) => b.tokenBalance - a.tokenBalance);
  const largestHolder = sortedHolders[0];
  const smallestHolder = sortedHolders[sortedHolders.length - 1];
  
  // Calculate median
  const middleIndex = Math.floor(sortedHolders.length / 2);
  const medianHolding = sortedHolders.length % 2 === 0
    ? (sortedHolders[middleIndex - 1].tokenBalance + sortedHolders[middleIndex].tokenBalance) / 2
    : sortedHolders[middleIndex].tokenBalance;
  
  return {
    totalHolders,
    totalCirculating,
    averageHolding,
    medianHolding,
    largestHolder,
    smallestHolder,
    circulatingPercentage: (totalCirculating / TOTAL_SUPPLY) * 100
  };
}; 