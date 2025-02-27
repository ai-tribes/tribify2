import React, { createContext, useState, useContext, useEffect } from 'react';
import { TribifyContext } from '../context/TribifyContext';

// Create context
export const ShareholderContext = createContext();

export const ShareholderProvider = ({ children }) => {
  const [shareholders, setShareholders] = useState([]);
  const [loading, setLoading] = useState(false);
  const { tokenHolders } = useContext(TribifyContext);
  
  // Total supply of TRIBIFY tokens
  const TOTAL_SUPPLY = 1_000_000_000; // 1 Billion tokens

  useEffect(() => {
    const processShareholders = async () => {
      if (!tokenHolders || tokenHolders.length === 0) return;
      
      setLoading(true);
      try {
        // Process tokenHolders data into a more useful format for shareholders
        const processedShareholders = tokenHolders.map((holder, index) => {
          const percentOwnership = (holder.tokenBalance / TOTAL_SUPPLY) * 100;
          
          return {
            id: holder.address, // Using address as ID for consistency
            address: holder.address,
            name: holder.name || `Shareholder ${index + 1}`,
            shares: holder.tokenBalance,
            percentOwnership: percentOwnership,
            joinDate: holder.firstSeen || new Date().toISOString(),
            verified: !!holder.isVerified,
            // Additional fields that might be useful for airdrops and dividends
            status: percentOwnership > 1 ? 'major' : percentOwnership > 0.1 ? 'significant' : 'minor',
            tags: []
          };
        });
        
        // Sort by shares in descending order
        setShareholders(processedShareholders.sort((a, b) => b.shares - a.shares));
      } catch (error) {
        console.error('Error processing shareholder data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    processShareholders();
  }, [tokenHolders]);
  
  return (
    <ShareholderContext.Provider value={{ 
      shareholders, 
      loading,
      addShareholder: (newShareholder) => {
        setShareholders(prev => [...prev, newShareholder]);
      },
      updateShareholder: (address, updatedData) => {
        setShareholders(prev => prev.map(sh => 
          sh.address === address ? { ...sh, ...updatedData } : sh
        ));
      },
      removeShareholder: (address) => {
        setShareholders(prev => prev.filter(sh => sh.address !== address));
      },
      addShareholderTag: (address, tag) => {
        setShareholders(prev => prev.map(sh => 
          sh.address === address 
            ? { ...sh, tags: [...new Set([...sh.tags, tag])] } 
            : sh
        ));
      },
      removeShareholderTag: (address, tag) => {
        setShareholders(prev => prev.map(sh => 
          sh.address === address 
            ? { ...sh, tags: sh.tags.filter(t => t !== tag) } 
            : sh
        ));
      }
    }}>
      {children}
    </ShareholderContext.Provider>
  );
};

// Hook for easy context use
export const useShareholders = () => useContext(ShareholderContext); 