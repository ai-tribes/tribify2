import { PublicKey } from '@solana/web3.js';
import axios from 'axios';

// Cache for token metadata to avoid redundant fetches
const tokenMetadataCache = new Map();

/**
 * Retrieves token metadata from the Solana blockchain using metadata program
 */
export const getTokenMetadata = async (tokenMintAddress, connection) => {
  if (!tokenMintAddress) return null;
  
  // Check cache first
  if (tokenMetadataCache.has(tokenMintAddress)) {
    return tokenMetadataCache.get(tokenMintAddress);
  }
  
  try {
    // Convert to PublicKey if it's a string
    const mintPublicKey = typeof tokenMintAddress === 'string' 
      ? new PublicKey(tokenMintAddress)
      : tokenMintAddress;
    
    // First try to get from Helius token API if available
    try {
      const response = await axios.get(
        `https://api.helius.xyz/v0/tokens/metadata?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
        { 
          params: { 
            mintAccounts: [mintPublicKey.toString()]
          }
        }
      );
      
      if (response.data && response.data.length > 0) {
        const metadata = response.data[0];
        const result = {
          address: tokenMintAddress.toString(),
          name: metadata.name || 'Unknown Token',
          symbol: metadata.symbol || 'UNKNOWN',
          decimals: metadata.decimals || 9,
          logo: metadata.logo || null
        };
        
        // Cache the result
        tokenMetadataCache.set(tokenMintAddress.toString(), result);
        return result;
      }
    } catch (heliusError) {
      console.warn('Failed to get token metadata from Helius:', heliusError);
      // Continue to fallback methods
    }
    
    // Fallback to use metadata program
    // In a real implementation, you would query the token metadata program
    // For simplicity, we'll return a basic object for common tokens
    
    // Hardcoded data for common tokens
    const knownTokens = {
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
      },
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': {
        name: 'USDT',
        symbol: 'USDT',
        decimals: 6,
        logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg'
      },
      'So11111111111111111111111111111111111111112': {
        name: 'Wrapped SOL',
        symbol: 'SOL',
        decimals: 9,
        logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
      },
      '672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump': {
        name: 'TRIBIFY',
        symbol: 'TRIB',
        decimals: 9,
        logo: null
      }
    };
    
    const tokenAddress = mintPublicKey.toString();
    if (knownTokens[tokenAddress]) {
      const result = {
        address: tokenAddress,
        ...knownTokens[tokenAddress]
      };
      
      // Cache the result
      tokenMetadataCache.set(tokenAddress, result);
      return result;
    }
    
    // Generic unknown token
    const result = {
      address: tokenAddress,
      name: `Token ${tokenAddress.slice(0, 4)}...${tokenAddress.slice(-4)}`,
      symbol: 'TOKEN',
      decimals: 9,
      logo: null
    };
    
    // Cache the result
    tokenMetadataCache.set(tokenAddress, result);
    return result;
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    return null;
  }
};

/**
 * Formats a token amount based on its decimals
 */
export const formatTokenAmount = (amount, decimals = 9) => {
  if (amount === undefined || amount === null) return '0';
  
  // Divide by 10^decimals
  const divisor = Math.pow(10, decimals);
  const formattedAmount = parseFloat(amount) / divisor;
  
  // Format based on the size of the number
  if (formattedAmount < 0.001 && formattedAmount > 0) {
    return '< 0.001';
  } else if (formattedAmount >= 1000000) {
    return `${(formattedAmount / 1000000).toFixed(2)}M`;
  } else if (formattedAmount >= 1000) {
    return `${(formattedAmount / 1000).toFixed(2)}K`;
  }
  
  // Format with appropriate decimal places
  if (Number.isInteger(formattedAmount)) {
    return formattedAmount.toString();
  } else if (formattedAmount < 0.1) {
    return formattedAmount.toFixed(6);
  } else if (formattedAmount < 1) {
    return formattedAmount.toFixed(4);
  } else {
    return formattedAmount.toFixed(2);
  }
}; 