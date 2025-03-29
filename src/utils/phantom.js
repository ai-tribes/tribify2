// Utility function to detect and get Phantom provider
export const getPhantomProvider = () => {
  if ('phantom' in window) {
    const provider = window.phantom?.solana;
    
    if (provider?.isPhantom) {
      return provider;
    }
  }

  // Check for Solana object which might also indicate Phantom
  if (window?.solana?.isPhantom) {
    return window.solana;
  }

  return null;
};

// Check if Phantom is installed
export const isPhantomInstalled = () => {
  const provider = getPhantomProvider();
  return !!provider;
};

// Get the current connection state
export const getPhantomConnectionState = () => {
  const provider = getPhantomProvider();
  if (!provider) return 'not-installed';
  if (provider.isConnected) return 'connected';
  return 'disconnected';
};

// Connect to Phantom wallet
export const connectPhantomWallet = async () => {
  try {
    const provider = getPhantomProvider();
    if (!provider) throw new Error('Phantom wallet is not installed');
    
    const response = await provider.connect();
    return response;
  } catch (error) {
    console.error('Error connecting to Phantom wallet:', error);
    throw error;
  }
};

// Disconnect from Phantom wallet
export const disconnectPhantomWallet = async () => {
  try {
    const provider = getPhantomProvider();
    if (!provider) throw new Error('Phantom wallet is not installed');
    
    await provider.disconnect();
  } catch (error) {
    console.error('Error disconnecting from Phantom wallet:', error);
    throw error;
  }
}; 