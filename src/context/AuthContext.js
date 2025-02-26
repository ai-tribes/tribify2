import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getFriendPassword, saveFriendPassword, isWalletConnected } from '../services/auth';
import { connectWallet, disconnectWallet, createConnection } from '../services/wallet';

/**
 * Authentication Context
 * Manages wallet connection, authentication state, and related functionality
 */
export const AuthContext = createContext({
  isConnected: false,
  publicKey: null,
  friendPassword: null,
  connection: null,
  statusMessage: '',
  connect: () => {},
  disconnect: () => {},
  setStatus: () => {},
  setFriendPassword: () => {}
});

/**
 * Authentication Provider Component
 * 
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components
 * @returns {JSX.Element} Provider component
 */
export const AuthProvider = ({ children }) => {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [connection, setConnection] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [friendPassword, setFriendPassword] = useState(getFriendPassword());

  // Initialize connection on first load
  useEffect(() => {
    setConnection(createConnection());
  }, []);

  // Auto-connect wallet if previously connected
  useEffect(() => {
    const attemptAutoConnect = async () => {
      try {
        if (await isWalletConnected()) {
          await handleConnect();
        }
      } catch (error) {
        console.error('Auto-connect failed:', error);
      }
    };

    if (connection) {
      attemptAutoConnect();
    }
  }, [connection]);

  // Handle status message clearing
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage('');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Handle connection
  const handleConnect = useCallback(async () => {
    if (!connection) {
      setStatusMessage('Connection not initialized.');
      return;
    }
    
    try {
      setStatusMessage('Connecting to wallet...');
      const { publicKey: connectedPublicKey } = await connectWallet();
      
      setPublicKey(connectedPublicKey);
      setIsConnected(true);
      setStatusMessage('Connected to wallet');
      
      return connectedPublicKey;
    } catch (error) {
      console.error('Connection error:', error);
      setStatusMessage(`Connection failed: ${error.message}`);
      return null;
    }
  }, [connection]);

  // Handle disconnection
  const handleDisconnect = useCallback(async () => {
    try {
      await disconnectWallet();
      setIsConnected(false);
      setPublicKey(null);
      setStatusMessage('Disconnected from wallet');
    } catch (error) {
      console.error('Disconnect error:', error);
      setStatusMessage(`Disconnect failed: ${error.message}`);
    }
  }, []);

  // Set status message
  const setStatus = useCallback((message) => {
    setStatusMessage(message);
  }, []);

  // Handle friend password change
  const handleSetFriendPassword = useCallback((password) => {
    setFriendPassword(password);
    saveFriendPassword(password);
  }, []);

  // Context value
  const value = {
    isConnected,
    publicKey,
    connection,
    statusMessage,
    friendPassword,
    connect: handleConnect,
    disconnect: handleDisconnect,
    setStatus,
    setFriendPassword: handleSetFriendPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook for easy context consumption
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 