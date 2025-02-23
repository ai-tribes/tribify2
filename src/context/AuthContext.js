import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  const login = async (walletKey) => {
    setIsAuthenticated(true);
    console.log('Logged in with wallet:', walletKey);
  };

  const disconnect = async () => {
    try {
      if (window.phantom?.solana?.isConnected) {
        await window.phantom.solana.disconnect();
      }
      localStorage.removeItem('tribify_parent_wallet');
      localStorage.removeItem('tribify_seed');
      setIsAuthenticated(false);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = () => {
      const isAuthed = window.phantom?.solana?.isConnected && 
                      localStorage.getItem('tribify_parent_wallet');
      setIsAuthenticated(isAuthed);
    };
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, disconnect }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 