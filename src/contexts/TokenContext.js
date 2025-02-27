import React, { createContext, useState, useContext, useEffect } from 'react';
import { TribifyContext } from '../context/TribifyContext';
import { Connection, PublicKey } from '@solana/web3.js';
import { getTokenMetadata } from '../utils/solana';

// Create context
export const TokenContext = createContext();

export const TokenProvider = ({ children }) => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const { publicKey } = useContext(TribifyContext);
  
  // Use Helius RPC connection
  const connection = new Connection(
    `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY || 'YOUR_HELIUS_KEY'}`,
    { commitment: 'confirmed' }
  );

  useEffect(() => {
    const fetchUserTokens = async () => {
      if (!publicKey) return;
      
      setLoading(true);
      try {
        // Get token accounts owned by the user
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          new PublicKey(publicKey),
          { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
        );
        
        // Map token accounts to a more usable format with metadata
        const tokenPromises = tokenAccounts.value.map(async (tokenAccount) => {
          const tokenInfo = tokenAccount.account.data.parsed.info;
          const tokenMint = tokenInfo.mint;
          const balance = tokenInfo.tokenAmount.uiAmount;
          
          // Only include tokens with a positive balance
          if (balance > 0) {
            // Get token metadata if available
            let metadata = await getTokenMetadata(tokenMint, connection);
            
            return {
              address: tokenMint,
              symbol: metadata?.symbol || 'Unknown',
              name: metadata?.name || `Token ${tokenMint.slice(0, 8)}...`,
              balance,
              decimals: tokenInfo.tokenAmount.decimals,
              logo: metadata?.logo || null
            };
          }
          return null;
        });
        
        const resolvedTokens = await Promise.all(tokenPromises);
        setTokens(resolvedTokens.filter(token => token !== null));
      } catch (error) {
        console.error('Error fetching token data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserTokens();
  }, [publicKey, connection]);
  
  return (
    <TokenContext.Provider value={{ tokens, loading }}>
      {children}
    </TokenContext.Provider>
  );
};

// Hook for easy context use
export const useTokens = () => useContext(TokenContext); 