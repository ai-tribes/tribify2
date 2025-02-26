import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WalletService } from '../services';
import './WalletPage.css';

// Import sub-components
import WalletList from './WalletList';
import WalletStats from './WalletStats';
import WalletActions from './WalletActions';
import StatusMessage from './StatusMessage';
import WalletTransactions from './WalletTransactions';

/**
 * WalletPage component - Feature-based implementation
 * This is a redesigned version of the original WalletPage component with improved architecture
 * 
 * @returns {JSX.Element} WalletPage component
 */
const WalletPage = () => {
  const navigate = useNavigate();
  // WalletService is already an instance, no need to use 'new'
  
  // State to track wallet list
  const [walletList, setWalletList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('info');
  const [totals, setTotals] = useState({
    sol: 0,
    usdc: 0,
    tribify: 0
  });
  const [parentWallet, setParentWallet] = useState('');
  
  // State for transactions
  const [transactions, setTransactions] = useState([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  
  // Load wallet data on component mount
  useEffect(() => {
    // Check if user is logged in
    const parentWalletAddress = localStorage.getItem('tribify_parent_wallet');
    if (!parentWalletAddress) {
      navigate('/');
      return;
    }
    
    setParentWallet(parentWalletAddress);
    
    // Load existing wallets if available
    loadWallets();
    
    // Load transaction history
    loadTransactionHistory(parentWalletAddress);
  }, [navigate]);
  
  /**
   * Load transaction history for a wallet
   */
  const loadTransactionHistory = async (walletAddress) => {
    try {
      setIsLoadingTransactions(true);
      const history = await WalletService.getTransactionHistory(walletAddress, 10);
      setTransactions(history);
    } catch (error) {
      console.error('Error loading transaction history:', error);
      showStatus('Error loading transaction history', 'error');
    } finally {
      setIsLoadingTransactions(false);
    }
  };
  
  /**
   * Load existing wallets from localStorage
   */
  const loadWallets = async (walletAddress = parentWallet) => {
    try {
      setIsLoading(true);
      showStatus('Loading wallets...', 'info');
      
      // Load wallets from storage
      let existingWallets = await WalletService.loadWallets(walletAddress);
      
      // If no wallets found, generate new ones
      if (!existingWallets || existingWallets.length === 0) {
        showStatus('No wallets found, generating new ones...', 'info');
        existingWallets = await WalletService.generateWallets(walletAddress, 5);
      }
      
      // Get addresses for balance fetching
      const addresses = existingWallets.map(wallet => wallet.publicKey);
      
      // Fetch balances
      if (addresses.length > 0) {
        const balances = await WalletService.fetchBalances(addresses);
        
        // Combine wallet data with balances
        const walletsWithBalances = existingWallets.map(wallet => {
          const balance = balances[wallet.publicKey] || { sol: 0, usdc: 0, tribify: 0 };
          return {
            ...wallet,
            solBalance: parseFloat(balance.sol || 0),
            usdcBalance: parseFloat(balance.usdc || 0),
            tribifyBalance: parseInt(balance.tribify || 0)
          };
        });
        
        setWalletList(walletsWithBalances);
        
        // Calculate totals
        const calculatedTotals = walletsWithBalances.reduce((acc, wallet) => {
          return {
            sol: acc.sol + (wallet.solBalance || 0),
            usdc: acc.usdc + (wallet.usdcBalance || 0),
            tribify: acc.tribify + (wallet.tribifyBalance || 0)
          };
        }, { sol: 0, usdc: 0, tribify: 0 });
        
        setTotals(calculatedTotals);
        showStatus('Wallets loaded successfully', 'success');
      } else {
        showStatus('No wallets found', 'info');
      }
    } catch (error) {
      console.error('Error loading wallets:', error);
      showStatus('Error loading wallets', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Generate new HD wallets
   */
  const generateWallets = async () => {
    try {
      setIsLoading(true);
      showStatus('Generating wallets...', 'info');
      
      await WalletService.generateWallets(parentWallet, 5);
      
      // Refresh wallets after generating
      await loadWallets();
      
      showStatus('Wallets generated successfully', 'success');
    } catch (error) {
      console.error('Error generating wallets:', error);
      showStatus('Error generating wallets', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Copy wallet address to clipboard
   */
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        showStatus('Copied to clipboard!', 'success');
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        showStatus('Failed to copy', 'error');
      });
  };
  
  /**
   * Backup all wallets
   */
  const backupWallets = async () => {
    try {
      setIsLoading(true);
      showStatus('Creating backup...', 'info');
      
      const backup = await WalletService.backupWallets(parentWallet);
      
      // Create a blob and download it
      const backupBlob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
      const url = URL.createObjectURL(backupBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `tribify_wallet_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      showStatus('Backup created successfully', 'success');
    } catch (error) {
      console.error('Error creating backup:', error);
      showStatus('Error creating backup', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Restore wallets from a backup file
   */
  const restoreWallets = async (event) => {
    try {
      if (!event.target.files || !event.target.files[0]) {
        return;
      }
      
      setIsLoading(true);
      showStatus('Restoring from backup...', 'info');
      
      const file = event.target.files[0];
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const backupData = JSON.parse(e.target.result);
          
          await WalletService.restoreWallets(backupData, parentWallet);
          
          // Reload wallets after restore
          await loadWallets();
          
          showStatus('Wallets restored successfully', 'success');
        } catch (error) {
          console.error('Error parsing backup:', error);
          showStatus('Error parsing backup file', 'error');
        } finally {
          setIsLoading(false);
        }
      };
      
      reader.onerror = () => {
        showStatus('Error reading backup file', 'error');
        setIsLoading(false);
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Error restoring backup:', error);
      showStatus('Error restoring backup', 'error');
      setIsLoading(false);
    }
  };
  
  /**
   * Show status message with a timer
   */
  const showStatus = (message, type = 'info', duration = 3000) => {
    setStatusMessage(message);
    setStatusType(type);
    
    if (duration > 0) {
      setTimeout(() => {
        setStatusMessage('');
      }, duration);
    }
  };
  
  return (
    <div className="feature-wallet-page">
      <div className="wallet-header">
        <h1>Tribify Wallets</h1>
        <WalletActions 
          onGenerateWallets={generateWallets}
          onRefreshWallets={loadWallets}
          onBackupWallets={backupWallets}
          onRestoreWallets={restoreWallets}
          isLoading={isLoading}
        />
      </div>
      
      <StatusMessage message={statusMessage} type={statusType} />
      
      <div className="wallet-content">
        <WalletStats totals={totals} />
        
        <WalletList 
          wallets={walletList}
          onCopyAddress={copyToClipboard}
          onGenerateWallets={generateWallets}
          isLoading={isLoading}
        />
        
        <WalletTransactions 
          transactions={transactions}
          isLoading={isLoadingTransactions}
        />
      </div>
    </div>
  );
};

export default WalletPage; 