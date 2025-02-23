import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import CryptoJS from 'crypto-js';
import bs58 from 'bs58';
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  transfer,
  TOKEN_PROGRAM_ID 
} from '@solana/spl-token';
import TokenDistributor from './TokenDistributor';
// Import the new component
import FundSubwallets from './FundSubwallets';
// Add these imports at the top
import { Jupiter, QuoteCalculator } from '@jup-ag/sdk';
import { NATIVE_MINT } from '@solana/spl-token';
import './ConversionModal.css';
import ConversionModal from './ConversionModal';
import { TribifyContext } from '../context/TribifyContext';
import Layout from './Layout';
import Header from './Header';
import './WalletPage.css';

const TOTAL_SUPPLY = 1_000_000_000; // 1 Billion tokens

const TRIBIFY_TOKEN_MINT = "672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump";
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const HELIUS_RPC_URL = `https://rpc-devnet.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_API_KEY}`;
const connection = new Connection(HELIUS_RPC_URL);

const getHolderColor = (address, tokenBalance) => {
  if (address === '6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7') {
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

// Add toBigNumber utility function
const toBigNumber = (amount) => {
  // Convert to integer representation with 6 decimals
  return Math.floor(amount * Math.pow(10, 6)).toString();
};

// Add constants for recovery
const RECOVERY_SOL_AMOUNT = 0.002; // Amount of SOL needed for recovery (0.002 SOL)

// Add this helper function near the top
const getConnection = () => {
  return new Connection(
    `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
    {
      commitment: 'confirmed',
      wsEndpoint: undefined,
      confirmTransactionInitialTimeout: 60000
    }
  );
};

// Add these near the top of the file, after imports
const RPC_ENDPOINTS = [
  `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
  `https://api.mainnet-beta.solana.com`,
  `https://solana-api.projectserum.com`
];

// Add these constants at the top
const PUMP_LP_ADDRESS = '6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7';
// const PUMP_PROGRAM_ID = new PublicKey('PuMpFhQoAMRPFhQoAMRPFhQoAMRPFhQoAMRP'); // Replace with actual program ID

class TransactionQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.currentEndpointIndex = 0;
  }

  getNextEndpoint() {
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % RPC_ENDPOINTS.length;
    return RPC_ENDPOINTS[this.currentEndpointIndex];
  }

  async add(transactions, onProgress) {
    this.queue.push(...transactions);
    if (!this.processing) {
      this.processing = true;
      await this.process(onProgress);
    }
  }

  async process(onProgress) {
    const BATCH_SIZE = 8;
    let processed = 0;

    while (this.queue.length > 0) {
      const endpoint = this.getNextEndpoint();
      const connection = new Connection(endpoint, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000
      });

      const batch = this.queue.splice(0, BATCH_SIZE);
      try {
        const { blockhash } = await connection.getLatestBlockhash();
        
        // Process batch in parallel
        await Promise.all(batch.map(async (tx) => {
          tx.recentBlockhash = blockhash;
          try {
            const signature = await connection.sendRawTransaction(tx.serialize());
            await connection.confirmTransaction(signature);
            processed++;
            onProgress?.(processed);
          } catch (error) {
            console.error('Transaction failed:', error);
            if (error.toString().includes('429')) {
              // If rate limited, put back in queue and switch endpoints
              this.queue.push(tx);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }));
      } catch (error) {
        console.error('Batch failed:', error);
      }

      // Add delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    this.processing = false;
  }
}

const txQueue = new TransactionQueue();

function WalletPage() {
  const navigate = useNavigate();
  const { publicKey, subwallets, setSubwallets } = useContext(TribifyContext);
  
  // State variables
  const [parentBalances, setParentBalances] = useState({ TRIBIFY: 0, SOL: 0, USDC: 0 });
  const [showPrivateKey, setShowPrivateKey] = useState(null);
  const [showPrivateKeys, setShowPrivateKeys] = useState(false);
  const [walletBalances, setWalletBalances] = useState({});
  const [conversionStatus, setConversionStatus] = useState({
    isConverting: false,
    fromToken: null,
    toToken: null,
    error: null,
    retryCount: 0,
    inProgress: false,
    totalConverted: 0
  });

  // Functions
  const clearStorage = () => {
    if (window.confirm('Are you sure you want to clear all wallet data?')) {
      localStorage.clear();
      setSubwallets([]);
      setParentBalances({ TRIBIFY: 0, SOL: 0, USDC: 0 });
      setWalletBalances({});
      navigate('/app');
    }
  };

  const refreshBalances = async () => {
    try {
      const connection = getConnection();
      // Refresh parent wallet balances
      const parentWallet = new PublicKey(publicKey);
      const solBalance = await connection.getBalance(parentWallet) / LAMPORTS_PER_SOL;
      
      // Get TRIBIFY and USDC balances
      const tribifyAta = await getAssociatedTokenAddress(
        new PublicKey(TRIBIFY_TOKEN_MINT),
        parentWallet
      );
      const usdcAta = await getAssociatedTokenAddress(
        new PublicKey(USDC_MINT),
        parentWallet
      );

      const [tribifyAccount, usdcAccount] = await Promise.all([
        connection.getTokenAccountBalance(tribifyAta).catch(() => ({ value: { uiAmount: 0 } })),
        connection.getTokenAccountBalance(usdcAta).catch(() => ({ value: { uiAmount: 0 } }))
      ]);

      setParentBalances({
        TRIBIFY: tribifyAccount.value.uiAmount || 0,
        SOL: solBalance,
        USDC: usdcAccount.value.uiAmount || 0
      });

      // Refresh subwallet balances
      const newBalances = {};
      await Promise.all(subwallets.map(async (wallet) => {
        const solBal = await connection.getBalance(wallet.publicKey) / LAMPORTS_PER_SOL;
        const tribifyAta = await getAssociatedTokenAddress(
          new PublicKey(TRIBIFY_TOKEN_MINT),
          wallet.publicKey
        );
        const usdcAta = await getAssociatedTokenAddress(
          new PublicKey(USDC_MINT),
          wallet.publicKey
        );

        const [tribifyBal, usdcBal] = await Promise.all([
          connection.getTokenAccountBalance(tribifyAta).catch(() => ({ value: { uiAmount: 0 } })),
          connection.getTokenAccountBalance(usdcAta).catch(() => ({ value: { uiAmount: 0 } }))
        ]);

        newBalances[wallet.publicKey.toString()] = {
          TRIBIFY: tribifyBal.value.uiAmount || 0,
          SOL: solBal,
          USDC: usdcBal.value.uiAmount || 0
        };
      }));

      setWalletBalances(newBalances);
    } catch (error) {
      console.error('Error refreshing balances:', error);
    }
  };

  const handleRestore = async (event) => {
    try {
      const file = event.target.files[0];
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const content = e.target.result;
        const wallets = JSON.parse(content);
        
        // Validate the wallet data
        if (!Array.isArray(wallets) || !wallets.every(w => w.publicKey && w.secretKey)) {
          throw new Error('Invalid wallet backup file format');
        }

        setSubwallets(wallets.map(w => ({
          publicKey: new PublicKey(w.publicKey),
          secretKey: w.secretKey
        })));

        await refreshBalances();
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('Error restoring wallets:', error);
      alert('Failed to restore wallets: ' + error.message);
    }
  };

  // Effect to refresh balances on mount
  useEffect(() => {
    refreshBalances();
  }, []);

  const [selectedAmount, setSelectedAmount] = useState('');
  const [showBuyConfig, setShowBuyConfig] = useState(false);
  const [showSellConfig, setShowSellConfig] = useState(false);
  const [keypairs, setKeypairs] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedStates, setCopiedStates] = useState({});
  const [notification, setNotification] = useState(null);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [buyConfig, setBuyConfig] = useState({
    slippage: 1.0,
    priorityFee: 0.000001,
    walletCount: 1,
    minAmount: 0.1,
    maxAmount: 1.0,
    budget: 0,
    denominatedInSol: true,
    startTime: null,
    endTime: null,
    minInterval: 5,
    maxInterval: 30,
    randomOrder: true,
    denominationType: 'SOL',
  });
  const [showCAInput, setShowCAInput] = useState(false);
  const [caValue, setCAValue] = useState('');
  const [selectedAmountType, setSelectedAmountType] = useState('SOL');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [parentWalletAddress, setParentWalletAddress] = useState('');
  const [fundingWallet, setFundingWallet] = useState(null);
  const [budget, setBudget] = useState({
    amount: 0,
    currency: 'SOL' // or 'USDC'
  });
  const [isFundingModalOpen, setIsFundingModalOpen] = useState(false);
  const [fundingConfig, setFundingConfig] = useState({
    fundingWallet: null,
    amount: 0,
    currency: 'SOL'
  });
  const [sellConfig, setSellConfig] = useState({
    slippage: 1.0,
    priorityFee: 0.000001,
    walletCount: 1,
    minAmount: 0.1,
    maxAmount: 1.0,
    budget: 0,
    denominatedInSol: true,
    startTime: null,
    endTime: null,
    minInterval: 5,
    maxInterval: 30,
    randomOrder: true,
    denominationType: 'SOL',
  });
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [distributeConfig, setDistributeConfig] = useState({
    sourceType: 'parent',
    externalWallet: {
      publicKey: '',
      privateKey: ''
    },
    tokenAddress: TRIBIFY_TOKEN_MINT,
    amountPerWallet: 0,
    randomize: true,
    minAmount: 0,
    maxAmount: 0
  });
  const [showDistributeModal, setShowDistributeModal] = useState(false);

  // Add file input ref near other state declarations
  const fileInputRef = useRef(null);

  // Add new state for recovery
  const [recoveryStatus, setRecoveryStatus] = useState({
    isRecovering: false,
    inProgress: false,  // Add this flag
    processed: 0,
    total: 0,
    currentBatch: [],
    successfulWallets: [],
    failedWallets: [],
    totalRecovered: 0,
    fundedWallets: []
  });

  // Add new state for single address recovery
  const [singleRecoveryAddress, setSingleRecoveryAddress] = useState('');
  const [showSingleRecoveryModal, setShowSingleRecoveryModal] = useState(false);

  // Add new state for button loading
  const [loadingStates, setLoadingStates] = useState({
    recoverAll: false,
    recoverSingle: false
  });

  const [statusMessage, setStatusMessage] = useState(null);

  // Add new state for funding
  const [fundingModalState, setFundingModalState] = useState({
    amountPerWallet: 0.002,
    numberOfWallets: 1,
    parentSolBalance: 0,
    isRecovering: false,
    recoveredAmount: 0,
    isRandomDistribution: false, // Add this
    minAmount: 0.002, // Add min amount
    maxAmount: 0.01, // Add max amount
    isFunding: false,
    fundedCount: 0,
  });

  // Add this in WalletPage.js
  const { setPublicKeys } = useContext(TribifyContext);

  const showStatus = (message, duration = 3000) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(null), duration);
  };

  useEffect(() => {
    // Check if Phantom is installed
    if (!window.phantom?.solana) {
      navigate('/'); // Redirect to home page
      return;
    }

    // Check if wallet is connected
    if (!window.phantom.solana.isConnected) {
      navigate('/'); // Redirect to home page
      return;
    }

    const loadStoredKeypairs = () => {
      try {
        if (!window.phantom?.solana?.publicKey) return;
        
        const encryptedData = localStorage.getItem('tribify_keypairs');
        if (!encryptedData) {
          console.log('No stored keypairs found');
          return;
        }

        const walletAddress = window.phantom.solana.publicKey.toString();
        const decrypted = CryptoJS.AES.decrypt(encryptedData, walletAddress).toString(CryptoJS.enc.Utf8);
        const storedData = JSON.parse(decrypted);
        
        const loadedKeypairs = storedData.map(pair => 
          Keypair.fromSecretKey(new Uint8Array(pair.secretKey))
        );
        
        setKeypairs(loadedKeypairs);

        // Update TribifyContext with loaded keypairs
        setSubwallets(loadedKeypairs.map(kp => ({
          publicKey: kp.publicKey.toString()
        })));
        setPublicKeys(loadedKeypairs.map(kp => kp.publicKey.toString()));

        console.log('Loaded keypairs and updated context:', loadedKeypairs.length);
      } catch (error) {
        console.error('Failed to load stored keypairs:', error);
      }
    };

    loadStoredKeypairs();
  }, [setSubwallets, setPublicKeys]); // Add context setters to dependency array

  useEffect(() => {
    const storeKeypairs = () => {
      try {
        if (!window.phantom?.solana?.publicKey || keypairs.length === 0) return;

        const walletAddress = window.phantom.solana.publicKey.toString();
        console.log('Encrypting with wallet:', walletAddress);

        const storableData = keypairs.map(kp => ({
          publicKey: kp.publicKey.toString(),
          secretKey: Array.from(kp.secretKey)
        }));

        // Encrypt the data
        const encrypted = CryptoJS.AES.encrypt(
          JSON.stringify(storableData),
          walletAddress
        ).toString();

        console.log('Encrypted data length:', encrypted.length);
        console.log('First 50 chars of encrypted data:', encrypted.substring(0, 50));

        localStorage.setItem('tribify_keypairs', encrypted);
        console.log('Stored encrypted keypairs:', keypairs.length);
      } catch (error) {
        console.error('Failed to store keypairs:', error);
      }
    };

    storeKeypairs();
  }, [keypairs]);

  const generateHDWallet = async () => {
    if (!window.phantom?.solana?.isConnected) {
      alert('Please connect your Phantom wallet first');
      return;
    }

    try {
      setGenerating(true);
      
      // Get parent wallet public key
      const parentWalletKey = window.phantom.solana.publicKey.toString();
      console.log('Parent wallet:', parentWalletKey);

      // Create a unique message that includes the parent wallet address
      const message = `Tribify HD Wallet Generation\nParent: ${parentWalletKey}\nTimestamp: ${Date.now()}`;
      const encodedMessage = new TextEncoder().encode(message);
      
      // Get signature from parent wallet to use as seed
      const signatureResponse = await window.phantom.solana.signMessage(
        encodedMessage,
        'utf8'
      );

      // Extract signature bytes
      const signatureBytes = signatureResponse.signature ? 
        signatureResponse.signature : 
        signatureResponse;

      // Convert signature to proper format
      const seedBytes = Uint8Array.from(signatureBytes);
      
      const newKeypairs = [];
      
      // Generate 100 deterministic child wallets
      for (let i = 0; i < 100; i++) {
        try {
          // Use BIP44 path with parent wallet's signature as seed
          const path = `m/44'/501'/${i}'/0'`;
          const derivedBytes = derivePath(path, seedBytes).key;
          const keypair = Keypair.fromSeed(derivedBytes.slice(0, 32));
          newKeypairs.push(keypair);
        } catch (err) {
          console.error(`Failed to generate keypair ${i}:`, err);
        }
      }

      console.log(`Generated ${newKeypairs.length} child wallets`);

      // Store parent wallet reference
      localStorage.setItem('tribify_parent_wallet', parentWalletKey);

      // Store keypairs encrypted with parent wallet address
      const storableData = newKeypairs.map(kp => ({
        publicKey: kp.publicKey.toString(),
        secretKey: Array.from(kp.secretKey)
      }));

      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(storableData),
        parentWalletKey
      ).toString();

      localStorage.setItem('tribify_keypairs', encrypted);

      // Update state and context
      setKeypairs(newKeypairs);
      setSubwallets(newKeypairs.map(kp => ({
        publicKey: kp.publicKey.toString()
      })));
      setPublicKeys(newKeypairs.map(kp => kp.publicKey.toString()));

      setStatus('Successfully generated child wallets');

    } catch (error) {
      console.error('Failed to generate wallets:', error);
      setStatus('Failed to generate wallets: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const downloadKeypairs = () => {
    try {
      const parentWalletKey = window.phantom.solana.publicKey.toString();
      
      // Validate that these keypairs belong to this parent wallet
      const storedParentWallet = localStorage.getItem('tribify_parent_wallet');
      if (storedParentWallet !== parentWalletKey) {
        alert('Error: These keypairs do not belong to your connected wallet!');
        return;
      }

      const pairs = keypairs.map((kp, index) => ({
        index: index + 1,
        publicKey: kp.publicKey.toString(),
        privateKey: Buffer.from(kp.secretKey).toString('hex'),
        parentWallet: parentWalletKey // Include parent wallet for verification
      }));

      const data = JSON.stringify({
        parentWallet: parentWalletKey,
        timestamp: new Date().toISOString(),
        keypairs: pairs
      }, null, 2);

      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Create filename with parent wallet prefix (first 8 chars)
      const parentPrefix = parentWalletKey.slice(0, 8);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.download = `tribify-${parentPrefix}-keypairs-${timestamp}.json`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`Downloaded keypairs for parent wallet: ${parentWalletKey}`);
    } catch (error) {
      console.error('Failed to download keypairs:', error);
      alert('Failed to download keys: ' + error.message);
    }
  };

  const copyToClipboard = async (text, index, type) => {
    try {
      await navigator.clipboard.writeText(text);
      
      // Update copied state for this specific key
      setCopiedStates(prev => ({
        ...prev,
        [`${type}-${index}`]: true
      }));

      // Show notification
      setNotification(`${type === 'private' ? 'Private' : 'Public'} key copied to clipboard`);

      // Reset states after 2 seconds
      setTimeout(() => {
        setCopiedStates(prev => ({
          ...prev,
          [`${type}-${index}`]: false
        }));
        setNotification(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Add Buy and Distribute Functionality
  const buyAndDistribute = async () => {
    const {
      walletCount,
      minAmount,
      maxAmount,
      budget,
      fundingWallet,
      slippage,
      priorityFee,
      startTime,
      endTime,
      minInterval,
      maxInterval,
      randomOrder,
      denominationType
    } = buyConfig;

    // Validate funding wallet
    if (!fundingWallet) {
      setStatus('Funding wallet not configured');
      return;
    }

    // Check if budget is set
    if (!budget.amount || budget.amount <= 0) {
      setStatus('Invalid budget amount');
      return;
    }

    // Create keypair from funding wallet
    try {
      const fundingKeypair = Keypair.fromSecretKey(
        bs58.decode(fundingWallet.secretKey)
      );

      // Check funding wallet balance
      const balance = await connection.getBalance(fundingKeypair.publicKey);
      const balanceInSol = balance / LAMPORTS_PER_SOL;

      if (budget.currency === 'SOL' && balanceInSol < budget.amount) {
        setStatus('Insufficient funds in funding wallet');
        return;
      }

      // Track spent amount
      let spentAmount = 0;

      // Modify the scheduleBuy function to check budget
      const scheduleBuy = async () => {
        const currentTime = new Date();

        if (currentTime < new Date(startTime)) {
          const delay = new Date(startTime) - currentTime;
          setTimeout(scheduleBuy, delay);
          return;
        }

        if (currentTime > new Date(endTime)) {
          setStatus('Buy schedule has ended.');
          return;
        }

        // Check if we're still within budget
        if (spentAmount >= budget.amount) {
          setStatus('Budget limit reached');
          return;
        }

        // Calculate next buy amount
        const nextAmount = Math.random() * (maxAmount - minAmount) + minAmount;
        
        // Check if this purchase would exceed budget
        if (spentAmount + nextAmount > budget.amount) {
          setStatus('Remaining budget insufficient for next purchase');
          return;
        }

        // Perform the buy
        await performBuy(fundingKeypair);
        spentAmount += nextAmount;

        // Schedule the next buy
        setTimeout(scheduleBuy, Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval);
      };

      // Start the scheduling
      scheduleBuy();
    } catch (error) {
      console.error('Error with funding wallet:', error);
      setStatus('Invalid funding wallet configuration');
      return;
    }
  };

  const performBuy = async (keypair) => {
    const { denominationType, slippage, priorityFee } = buyConfig;
    
    try {
      // Depending on the denominationType, adjust the buy logic
      if (denominationType === 'SOL') {
        // Example: Swap SOL for TRIBIFY using a DEX (Placeholder)
        await buyTRIBIFY(keypair, selectedAmount, slippage, priorityFee);
      } else if (denominationType === 'USDC') {
        // Implement USDC purchasing logic
        await buyTRIBIFY_USDC(keypair, selectedAmount, slippage, priorityFee);
      } else if (denominationType === 'TRIBIFY') {
        // Direct mint or transfer TRIBIFY tokens
        await buyTRIBIFY_Token(keypair, selectedAmount, slippage, priorityFee);
      } else if (denominationType === 'CA') {
        // Handle Contract Address logic if applicable
        await buyTRIBIFY_CA(keypair, contractAddress, selectedAmount, slippage, priorityFee);
      }

      // After purchase, distribute tokens to target wallets
      await distributeTRIBIFY(keypair, selectedAmount);
      
      setStatus(`Successfully bought and distributed ${selectedAmount} TRIBIFY`);
    } catch (error) {
      console.error('Error during buy and distribute:', error);
      setStatus(`Error buying TRIBIFY: ${error.message}`);
    }
  };

  // Placeholder function to buy TRIBIFY using SOL
  const buyTRIBIFY = async (keypair, amount, slippage, priorityFee) => {
    // TODO: Implement the actual swap logic using a DEX like Raydium or Serum
    // This typically involves interacting with the DEX's API to create a swap transaction
    // Example:
    // const transaction = new Transaction().add(/* Swap instructions */);
    // await connection.sendTransaction(transaction, [keypair], {/* options */});
    
    console.log(`Buying ${amount} TRIBIFY using SOL from wallet ${keypair.publicKey.toString()}`);
    
    // Simulate purchase delay
    await new Promise(res => setTimeout(res, 1000));
  };

  // Placeholder functions for other denomination types
  const buyTRIBIFY_USDC = async (keypair, amount, slippage, priorityFee) => {
    // Implement USDC purchasing logic
    console.log(`Buying ${amount} TRIBIFY using USDC from wallet ${keypair.publicKey.toString()}`);
    await new Promise(res => setTimeout(res, 1000));
  };

  const buyTRIBIFY_Token = async (keypair, amount, slippage, priorityFee) => {
    // Implement TRIBIFY token logic
    console.log(`Handling TRIBIFY token directly from wallet ${keypair.publicKey.toString()}`);
    await new Promise(res => setTimeout(res, 1000));
  };

  const buyTRIBIFY_CA = async (keypair, contractAddress, amount, slippage, priorityFee) => {
    // Implement Contract Address logic
    console.log(`Buying TRIBIFY using CA from wallet ${keypair.publicKey.toString()} to contract ${contractAddress}`);
    await new Promise(res => setTimeout(res, 1000));
  };

  // Function to distribute TRIBIFY tokens to target wallets
  const distributeTRIBIFY = async (sourceKeypair, amount) => {
    const targetWallets = keypairs.slice(0, 5); // Example: distribute to first 5 wallets
    const tribifyMint = new PublicKey(TRIBIFY_TOKEN_MINT);

    for (let target of targetWallets) {
      try {
        const ata = await getAssociatedTokenAddress(tribifyMint, target.publicKey);
        
        // Create associated token account if it doesn't exist
        const transaction = new Transaction().add(
          createAssociatedTokenAccountInstruction(
            sourceKeypair.publicKey, // payer
            ata, // associated token account
            target.publicKey, // owner
            tribifyMint // mint
          )
        );

        // Transfer tokens
        transaction.add(
          transfer(
            sourceKeypair.publicKey, // from
            ata, // to
            sourceKeypair, // owner
            [], // multisigners
            amount * Math.pow(10, 6) // Assuming TRIBIFY has 6 decimals
          )
        );

        await connection.sendTransaction(transaction, [sourceKeypair], { skipPreflight: false, preflightCommitment: 'confirmed' });
        console.log(`Transferred ${amount} TRIBIFY to ${target.publicKey.toString()}`);
      } catch (error) {
        console.error(`Failed to transfer TRIBIFY to ${target.publicKey.toString()}:`, error);
      }
    }
  };

  // Add randomization function
  const randomizeConfig = (type) => {
    // Get current time
    const now = new Date();
    
    // Generate random start time between now and 24 hours from now
    const randomStartMinutes = Math.floor(Math.random() * 60); // 0-59 minutes
    const startTime = new Date(now.getTime() + randomStartMinutes * 60000);
    
    // Generate random end time between start time and 48 hours from start
    const minEndTime = startTime.getTime() + (60 * 60 * 1000); // minimum 1 hour after start
    const maxEndTime = startTime.getTime() + (48 * 60 * 60 * 1000); // maximum 48 hours after start
    const endTime = new Date(minEndTime + Math.random() * (maxEndTime - minEndTime));

    // Format dates to ISO string and trim milliseconds
    const formattedStartTime = startTime.toISOString().slice(0, 19);
    const formattedEndTime = endTime.toISOString().slice(0, 19);

    if (type === 'buy') {
      setBuyConfig({
        ...buyConfig,
        walletCount: Math.floor(Math.random() * 100) + 1, // 1-100
        minAmount: parseFloat((Math.random() * 0.5).toFixed(6)), // 0-0.5
        maxAmount: parseFloat((Math.random() * 1.5 + 0.5).toFixed(6)), // 0.5-2.0
        slippage: parseFloat((Math.random() * 4.9 + 0.1).toFixed(1)), // 0.1-5.0%
        priorityFee: parseFloat((Math.random() * 0.000009 + 0.000001).toFixed(6)), // 0.000001-0.00001
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        minInterval: Math.floor(Math.random() * 28) + 2, // 2-30 seconds
        maxInterval: Math.floor(Math.random() * 30) + 30, // 30-60 seconds
        randomOrder: Math.random() > 0.5, // 50% chance of random order
        denominationType: 'SOL'
      });
      setShowCAInput(false);
    } else if (type === 'sell') {
      setSellConfig({
        ...sellConfig,
        walletCount: Math.floor(Math.random() * 100) + 1, // 1-100
        minAmount: parseFloat((Math.random() * 0.5).toFixed(6)), // 0-0.5
        maxAmount: parseFloat((Math.random() * 1.5 + 0.5).toFixed(6)), // 0.5-2.0
        slippage: parseFloat((Math.random() * 4.9 + 0.1).toFixed(1)), // 0.1-5.0%
        priorityFee: parseFloat((Math.random() * 0.000009 + 0.000001).toFixed(6)), // 0.000001-0.00001
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        minInterval: Math.floor(Math.random() * 28) + 2, // 2-30 seconds
        maxInterval: Math.floor(Math.random() * 30) + 30, // 30-60 seconds
        randomOrder: Math.random() > 0.5, // 50% chance of random order
        denominationType: 'SOL'
      });
      setShowCAInput(false);
    }
  };

  const walletCountProps = {
    type: "number",
    min: "1",
    max: "100",
    value: buyConfig.walletCount,
    onChange: (e) => setBuyConfig({
      ...buyConfig,
      walletCount: Math.min(100, Math.max(1, parseInt(e.target.value) || 1))
    })
  };

  const minAmountProps = {
    type: "number",
    min: "0",
    step: "0.000001",
    value: buyConfig.minAmount,
    onChange: (e) => setBuyConfig({
      ...buyConfig,
      minAmount: Math.max(0, parseFloat(e.target.value) || 0)
    })
  };

  const maxAmountProps = {
    type: "number",
    min: "0",
    step: "0.000001",
    value: buyConfig.maxAmount,
    onChange: (e) => setBuyConfig({
      ...buyConfig,
      maxAmount: Math.max(buyConfig.minAmount, parseFloat(e.target.value) || 0)
    })
  };

  const startTimeProps = {
    type: "datetime-local",
    value: buyConfig.startTime || '',
    onChange: (e) => setBuyConfig({
      ...buyConfig,
      startTime: e.target.value
    })
  };

  const endTimeProps = {
    type: "datetime-local",
    min: buyConfig.startTime || '',
    value: buyConfig.endTime || '',
    onChange: (e) => setBuyConfig({
      ...buyConfig,
      endTime: e.target.value
    })
  };

  const minIntervalProps = {
    type: "number",
    min: "1",
    max: buyConfig.maxInterval,
    value: buyConfig.minInterval,
    onChange: (e) => setBuyConfig({
      ...buyConfig,
      minInterval: Math.max(1, parseInt(e.target.value) || 1)
    })
  };

  const maxIntervalProps = {
    type: "number",
    min: buyConfig.minInterval,
    value: buyConfig.maxInterval,
    onChange: (e) => setBuyConfig({
      ...buyConfig,
      maxInterval: Math.max(buyConfig.minInterval, parseInt(e.target.value) || buyConfig.minInterval)
    })
  };

  const slippageProps = {
    type: "number",
    min: "0.1",
    max: "100",
    step: "0.1",
    value: buyConfig.slippage,
    onChange: (e) => setBuyConfig({
      ...buyConfig,
      slippage: parseFloat(e.target.value)
    })
  };

  const priorityFeeProps = {
    type: "number",
    min: "0",
    step: "0.000001",
    value: buyConfig.priorityFee,
    onChange: (e) => setBuyConfig({
      ...buyConfig,
      priorityFee: parseFloat(e.target.value)
    })
  };

  const ConfigExplanation = ({ type }) => {
    const explanations = {
      buy: {
        title: "Buy Configuration Guide",
        sections: [
          {
            title: "Required Details",
            items: [
              "Contract Address: The token contract you want to buy",
              "ATA (Associated Token Account): Where tokens will be received",
              "RPC URL: Your custom RPC endpoint (optional)",
              "Priority Fee: Higher fees = faster transactions"
            ]
          },
          {
            title: "Amount Settings",
            items: [
              "Min/Max Amount: Range for random purchase sizes",
              "Wallet Count: Number of wallets to use (1-100)",
              "Random Order: Shuffles wallet sequence for privacy"
            ]
          },
          {
            title: "Timing Settings",
            items: [
              "Start/End Time: Schedule your buys",
              "Intervals: Random delays between transactions",
              "Slippage: Maximum acceptable price impact"
            ]
          }
        ]
      },
      sell: {
        title: "Sell Configuration Guide",
        sections: [
          {
            title: "Required Details",
            items: [
              "Token Address: The token you want to sell",
              "DEX Contract: The exchange contract address",
              "Output Token: Where to receive proceeds (SOL/USDC)",
              "Priority Fee: Higher fees = faster transactions"
            ]
          },
          {
            title: "Amount Settings",
            items: [
              "Min/Max Amount: Range for random sell sizes",
              "Wallet Count: Number of wallets to use (1-100)",
              "Random Order: Shuffles wallet sequence for privacy"
            ]
          },
          {
            title: "Timing Settings",
            items: [
              "Start/End Time: Schedule your sells",
              "Intervals: Random delays between transactions",
              "Slippage: Maximum acceptable price impact"
            ]
          }
        ]
      }
    };

    const content = explanations[type];

    return (
      <div className="config-explanation">
        <h2>{content.title}</h2>
        {content.sections.map((section, i) => (
          <div key={i} className="explanation-section">
            <h3>{section.title}</h3>
            <ul>
              {section.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  const calculateTotals = () => {
    return Object.entries(walletBalances)
      .filter(([key]) => key !== 'parent') // Exclude parent wallet
      .reduce((totals, [_, balance]) => {
        return {
          sol: totals.sol + (balance?.sol || 0),
          usdc: totals.usdc + (balance?.usdc || 0),
          tribify: totals.tribify + (balance?.tribify || 0)
        };
      }, { sol: 0, usdc: 0, tribify: 0 });
  };

  const fetchBalances = async () => {
    try {
      const connection = getConnection();
      const tribifyMint = new PublicKey('672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump');
      const newBalances = {};

      // Fetch parent wallet balance
      if (window.phantom?.solana?.publicKey) {
        const parentPubkey = window.phantom.solana.publicKey;
        
        // Fetch parent SOL balance
        const parentSolBalance = await connection.getBalance(parentPubkey);
        
        // Fetch parent TRIBIFY balance
        const parentTokenAccounts = await connection.getParsedTokenAccountsByOwner(
          parentPubkey,
          { mint: tribifyMint }
        );
        
        newBalances['parent'] = {
          tribify: parentTokenAccounts.value.length 
            ? parentTokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount 
            : 0,
          sol: parentSolBalance / LAMPORTS_PER_SOL
        };
      }

      // Fetch all subwallet balances
      await Promise.all(keypairs.map(async (kp, index) => {
        try {
          // Fetch SOL balance
          const solBalance = await connection.getBalance(kp.publicKey);
          
          // Fetch TRIBIFY balance
          const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            kp.publicKey,
            { mint: tribifyMint }
          );

          newBalances[kp.publicKey.toString()] = {
            tribify: tokenAccounts.value.length 
              ? tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount 
              : 0,
            sol: solBalance / LAMPORTS_PER_SOL
          };

        } catch (error) {
          console.error(`Error fetching balance for wallet ${index}:`, error);
          newBalances[kp.publicKey.toString()] = { tribify: 0, sol: 0 };
        }
      }));

      setWalletBalances(newBalances);
      console.log('Updated balances:', newBalances);

    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  useEffect(() => {
    if (keypairs.length > 0) {
      fetchBalances();
    }
  }, [keypairs]);

  useEffect(() => {
    const getParentWallet = async () => {
      try {
        if (window.phantom?.solana) {
          const response = await window.phantom.solana.connect();
          setParentWalletAddress(response.publicKey.toString());
        }
      } catch (error) {
        console.error('Error getting parent wallet:', error);
      }
    };
    
    getParentWallet();
  }, []);

  // Update the handleFileUpload function
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      // Handle both old and new backup formats
      let restoredKeypairs;
      
      if (Array.isArray(backupData)) {
        // Old format - direct array of keypairs
        restoredKeypairs = backupData.map(key => {
          try {
            const secretKey = typeof key === 'string' 
              ? new Uint8Array(Buffer.from(key, 'hex'))
              : new Uint8Array(key);
            return Keypair.fromSecretKey(secretKey);
          } catch (e) {
            console.error('Invalid key format:', e);
            return null;
          }
        }).filter(Boolean);
      } else if (backupData.keypairs) {
        // New format with parent wallet info
        const parentWallet = window.phantom.solana.publicKey.toString();
        
        // Allow restore if parent wallet matches or user confirms
        if (backupData.parentWallet !== parentWallet) {
          const confirmed = window.confirm(
            'Warning: This backup appears to be from a different wallet.\n\n' +
            'Only restore if you are sure these are the correct keys.\n\n' +
            'Do you want to proceed?'
          );
          if (!confirmed) return;
        }

        restoredKeypairs = backupData.keypairs.map(pair => {
          try {
            const secretKey = new Uint8Array(
              pair.privateKey.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
            );
            return Keypair.fromSecretKey(secretKey);
          } catch (e) {
            console.error('Invalid key format:', e);
            return null;
          }
        }).filter(Boolean);
      } else {
        throw new Error('Unrecognized backup format');
      }

      if (restoredKeypairs.length === 0) {
        throw new Error('No valid keys found in backup file');
      }

      // Store the restored keypairs
      const storableData = restoredKeypairs.map(kp => ({
        publicKey: kp.publicKey.toString(),
        secretKey: Array.from(kp.secretKey)
      }));

      const parentWallet = window.phantom.solana.publicKey.toString();
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(storableData),
        parentWallet
      ).toString();

      localStorage.setItem('tribify_keypairs', encrypted);
      localStorage.setItem('tribify_parent_wallet', parentWallet);

      // Update state
      setKeypairs(restoredKeypairs);
      setSubwallets(restoredKeypairs.map(kp => ({
        publicKey: kp.publicKey.toString()
      })));
      setPublicKeys(restoredKeypairs.map(kp => kp.publicKey.toString()));

      setStatus(`Successfully restored ${restoredKeypairs.length} wallets`);
      
      // Refresh balances after restore
      await fetchBalances();

    } catch (error) {
      console.error('Error restoring keys:', error);
      setStatus(`Failed to restore keys: ${error.message}`);
    }
    
    // Reset file input
    event.target.value = '';
  };

  const handleFundWallets = async () => {
    try {
      // Add funding logic here
      console.log('Funding wallets...');
    } catch (error) {
      console.error('Error funding wallets:', error);
    }
  };

  const distributeFunds = async () => {
    if (!fundingConfig.fundingWallet) {
      setStatus('Funding wallet not configured');
      return;
    }

    try {
      const fundingKeypair = Keypair.fromSecretKey(
        bs58.decode(fundingConfig.fundingWallet.secretKey)
      );

      // Check funding wallet balance
      const balance = await connection.getBalance(fundingKeypair.publicKey);
      const balanceInSol = balance / LAMPORTS_PER_SOL;

      if (fundingConfig.currency === 'SOL' && balanceInSol < fundingConfig.amount) {
        setStatus('Insufficient funds in funding wallet');
        return;
      }

      // Calculate amount per wallet
      const amountPerWallet = fundingConfig.amount / keypairs.length;

      // Distribute to each wallet
      for (const keypair of keypairs) {
        if (fundingConfig.currency === 'SOL') {
          const transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: fundingKeypair.publicKey,
              toPubkey: keypair.publicKey,
              lamports: amountPerWallet * LAMPORTS_PER_SOL
            })
          );

          await connection.sendTransaction(transaction, [fundingKeypair]);
        } else if (fundingConfig.currency === 'USDC') {
          // Implement USDC transfer logic here
        }
      }

      setStatus('Successfully distributed funds to all wallets');
      setIsFundingModalOpen(false);
    } catch (error) {
      console.error('Error distributing funds:', error);
      setStatus(`Failed to distribute funds: ${error.message}`);
    }
  };

  const HoldersList = ({ holders, onNodeClick, nicknames, setNicknames }) => {
    const [editingNickname, setEditingNickname] = useState(null);

    // Sort holders by token balance in descending order
    const sortedHolders = [...holders].sort((a, b) => b.tokenBalance - a.tokenBalance);

    return (
      <div className="holders-list">
        <div className="holder-header">
          <div className="holder-col address">Address</div>
          <div className="holder-col percent">Share</div>
          <div className="holder-col name">Name</div>
          <div className="holder-col balance">$TRIBIFY</div>
          <div className="holder-col sol">SOL</div>
          <div className="holder-col usdc">USDC</div>
          <div className="holder-col message">Message</div>
        </div>
        {sortedHolders.map((holder) => (
          <div key={holder.address} className="holder-item">
            <div className="holder-col address">
              ◈ {holder.address}
            </div>
            <div className="holder-col percent" style={{
              color: getHolderColor(holder.address, holder.tokenBalance)
            }}>
              {((holder.tokenBalance / TOTAL_SUPPLY) * 100).toFixed(4)}%
            </div>
            <div className="holder-col name">
              {editingNickname === holder.address ? (
                <input
                  autoFocus
                  defaultValue={nicknames[holder.address] || ''}
                  onBlur={(e) => {
                    setNicknames(prev => ({...prev, [holder.address]: e.target.value}));
                    setEditingNickname(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setNicknames(prev => ({...prev, [holder.address]: e.target.value}));
                      setEditingNickname(null);
                    }
                  }}
                />
              ) : (
                <span onClick={() => setEditingNickname(holder.address)}>
                  {nicknames[holder.address] || '+ Add name'}
                </span>
              )}
            </div>
            <div className="holder-col balance">
              {holder.tokenBalance.toLocaleString()}
            </div>
            <div className="holder-col sol">
              {holder.solBalance?.toFixed(4) || '0.0000'}
            </div>
            <div className="holder-col usdc">
              $ {holder.usdcBalance?.toFixed(2) || '0.00'}
            </div>
            <div className="holder-col message">
              {holder.address !== '6MFyLKnyJgZnVLL8NoVVauoKFHRRbZ7RAjboF2m47me7' && (
                <button onClick={() => onNodeClick(holder.address)}>
                  Message
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const sellAndDistribute = async () => {
    const {
      walletCount,
      minAmount,
      maxAmount,
      slippage,
      priorityFee,
      startTime,
      endTime,
      minInterval,
      maxInterval,
      randomOrder,
      denominationType
    } = sellConfig;

    try {
      // Track sold amount
      let soldAmount = 0;

      // Modify the scheduleSell function to check remaining balance
      const scheduleSell = async () => {
        const currentTime = new Date();

        if (currentTime < new Date(startTime)) {
          const delay = new Date(startTime) - currentTime;
          setTimeout(scheduleSell, delay);
          return;
        }

        if (currentTime > new Date(endTime)) {
          setStatus('Sell schedule has ended.');
          return;
        }

        // Calculate next sell amount
        const nextAmount = Math.random() * (maxAmount - minAmount) + minAmount;

        // Perform the sell
        await performSell(nextAmount);
        soldAmount += nextAmount;

        // Schedule the next sell
        setTimeout(scheduleSell, Math.floor(Math.random() * (maxInterval - minInterval + 1) + minInterval) * 1000);
      };

      // Start the scheduling
      scheduleSell();
    } catch (error) {
      console.error('Error in sell and distribute:', error);
      setStatus('Failed to start selling: ' + error.message);
    }
  };

  const performSell = async (amount) => {
    const { denominationType, slippage, priorityFee } = sellConfig;
    
    try {
      // Implement your selling logic here based on denominationType
      if (denominationType === 'SOL') {
        // Implement SOL selling logic
      } else if (denominationType === 'USDC') {
        // Implement USDC selling logic
      } else if (denominationType === 'TRIBIFY') {
        // Implement TRIBIFY selling logic
      }
      
      setStatus(`Successfully sold ${amount} ${denominationType}`);
    } catch (error) {
      console.error('Error during sell:', error);
      setStatus(`Error selling ${denominationType}: ${error.message}`);
    }
  };

  const handleDistribute = () => {
    setShowDistributeModal(true);
  };

  const recoverTokens = async (fromWallet) => {
    try {
      const connection = new Connection(
        `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
        { commitment: 'confirmed' }
      );

      // First check SOL balance
      const solBalance = await connection.getBalance(fromWallet.publicKey);
      if (solBalance < LAMPORTS_PER_SOL * 0.001) {
        throw new Error(`Insufficient SOL balance (${(solBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL) to pay for transaction fees. Need at least 0.001 SOL.`);
      }

      const tribifyMint = new PublicKey('672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump');
      const parentWallet = new PublicKey(window.phantom.solana.publicKey.toString());
      
      // Get the token accounts
      const fromATA = await getAssociatedTokenAddress(tribifyMint, fromWallet.publicKey);
      const toATA = await getAssociatedTokenAddress(tribifyMint, parentWallet);

      // Check TRIBIFY balance
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        fromWallet.publicKey,
        { mint: tribifyMint }
      );

      if (!tokenAccounts.value.length) {
        throw new Error('No TRIBIFY token account found for this wallet');
      }

      const tribifyBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.amount;
      if (tribifyBalance <= 0) {
        throw new Error('No TRIBIFY tokens to recover in this wallet');
      }

      console.log(`Attempting to recover ${tribifyBalance} TRIBIFY tokens...`);

      // Create and send the transfer transaction
      const transaction = new Transaction();

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          fromATA,
          toATA,
          fromWallet.publicKey,
          tribifyBalance
        )
      );

      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = fromWallet.publicKey;

      // Sign with the subwallet's private key
      const keypair = Keypair.fromSecretKey(new Uint8Array(fromWallet.secretKey));
      transaction.sign(keypair);

      const signature = await connection.sendRawTransaction(transaction.serialize());
      console.log('Recovery transaction sent:', signature);
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature);
      if (confirmation.value.err) {
        throw new Error('Transaction failed to confirm');
      }

      // Verify the transfer
      const newBalance = await connection.getParsedTokenAccountsByOwner(
        fromWallet.publicKey,
        { mint: tribifyMint }
      );

      if (newBalance.value[0].account.data.parsed.info.tokenAmount.amount > 0) {
        throw new Error('Transfer did not complete - tokens still in wallet');
      }

      return signature;

    } catch (error) {
      console.error('Recovery failed:', error);
      throw new Error(`Recovery failed: ${error.message}`);
    }
  };

  const findAndRecoverFromWallet = async (targetAddress) => {
    try {
      // Find the keypair with this public key
      const wallet = keypairs.find(kp => 
        kp.publicKey.toString() === targetAddress
      );

      if (!wallet) {
        throw new Error('Address not found in subwallets');
      }

      console.log(`Found wallet, attempting recovery...`);
      const signature = await recoverTokens({
        publicKey: wallet.publicKey,
        secretKey: Array.from(wallet.secretKey)
      });

      console.log('Recovery successful, signature:', signature);
      return signature;
    } catch (error) {
      console.error('Recovery failed:', error);
      throw error;
    }
  };

  // Add helper function to fund a wallet
  const fundWalletForRecovery = async (targetWallet) => {
    try {
      const connection = new Connection(
        `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
        { commitment: 'confirmed' }
      );

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(window.phantom.solana.publicKey.toString()),
          toPubkey: targetWallet,
          lamports: LAMPORTS_PER_SOL * RECOVERY_SOL_AMOUNT
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(window.phantom.solana.publicKey.toString());

      const signed = await window.phantom.solana.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature);
      
      return signature;
    } catch (error) {
      throw new Error(`Failed to fund wallet: ${error.message}`);
    }
  };

  // Update single address recovery
  const recoverSingleAddress = async (address) => {
    try {
      const connection = new Connection(
        `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
        { commitment: 'confirmed' }
      );

      // Check SOL balance
      const solBalance = await connection.getBalance(new PublicKey(address));
      if (solBalance < LAMPORTS_PER_SOL * 0.001) {
        const shouldFund = window.confirm(
          `This wallet needs ${RECOVERY_SOL_AMOUNT} SOL to perform the recovery. Would you like to fund it now?`
        );

        if (shouldFund) {
          await fundWalletForRecovery(new PublicKey(address));
          // Wait a moment for the network to process the funding
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw new Error('Insufficient SOL for recovery. Please fund the wallet first.');
        }
      }

      await findAndRecoverFromWallet(address);
      alert('Recovery successfully completed!');
      fetchBalances();
    } catch (error) {
      alert(error.message);
    }
  };

  // Update recover all tokens function
  const recoverAllTokens = async () => {
    showStatus('Starting recovery process...');
    if (!window.confirm('Are you sure you want to recover all TRIBIFY tokens from all subwallets back to the parent wallet?')) {
      return;
    }

    setRecoveryStatus({
      isRecovering: true,
      inProgress: true,
      processed: 0,
      total: keypairs.length,
      currentBatch: [],
      successfulWallets: [],
      failedWallets: [],
      totalRecovered: 0,
      fundedWallets: []
    });

    try {
      const connection = new Connection(
        `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
        { commitment: 'confirmed' }
      );

      const tribifyMint = new PublicKey('672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump');

      // First, identify wallets that have TRIBIFY tokens AND need SOL
      const walletsToRecover = [];
      
      console.log('Checking wallets for TRIBIFY tokens...');
      
      for (const wallet of keypairs) {
        try {
          // Check TRIBIFY balance first
          const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            wallet.publicKey,
            { mint: tribifyMint }
          );

          const tribifyBalance = tokenAccounts.value.length 
            ? tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount 
            : 0;

          if (tribifyBalance > 0) {
            // Only check SOL balance if there are TRIBIFY tokens
            const solBalance = await connection.getBalance(wallet.publicKey);
            if (solBalance < LAMPORTS_PER_SOL * 0.001) {
              walletsToRecover.push({
                publicKey: wallet.publicKey,
                tribifyBalance,
                needsFunding: true
              });
            } else {
              walletsToRecover.push({
                publicKey: wallet.publicKey,
                tribifyBalance,
                needsFunding: false
              });
            }
          }
        } catch (error) {
          console.error(`Error checking wallet ${wallet.publicKey.toString()}:`, error);
        }
      }

      if (walletsToRecover.length === 0) {
        throw new Error('No wallets found with TRIBIFY tokens to recover.');
      }

      const walletsThatNeedFunding = walletsToRecover.filter(w => w.needsFunding);
      
      if (walletsThatNeedFunding.length > 0) {
        const totalCost = RECOVERY_SOL_AMOUNT * walletsThatNeedFunding.length;
        const shouldFund = window.confirm(
          `Found ${walletsToRecover.length} wallets with TRIBIFY tokens.\n` +
          `${walletsThatNeedFunding.length} of these need funding (${totalCost} SOL total) to perform recovery.\n` +
          `Would you like to fund them now?`
        );

        if (shouldFund) {
          for (const wallet of walletsThatNeedFunding) {
            try {
              await fundWalletForRecovery(wallet.publicKey);
              setRecoveryStatus(prev => ({
                ...prev,
                fundedWallets: [...prev.fundedWallets, wallet.publicKey.toString()]
              }));
            } catch (error) {
              console.error(`Failed to fund wallet ${wallet.publicKey.toString()}:`, error);
            }
          }
          // Wait a moment for the network to process the funding
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw new Error('Recovery cancelled. Some wallets need funding to proceed.');
        }
      }

      // Update total in recovery status
      setRecoveryStatus(prev => ({
        ...prev,
        total: walletsToRecover.length
      }));

      // Process recoveries in batches
      const BATCH_SIZE = 4;
      for (let i = 0; i < walletsToRecover.length; i += BATCH_SIZE) {
        const batch = walletsToRecover.slice(i, i + BATCH_SIZE);
        setRecoveryStatus(prev => ({ 
          ...prev, 
          currentBatch: batch.map(w => w.publicKey.toString()) 
        }));

        // Actually process the batch
        await Promise.all(batch.map(async (wallet) => {
          try {
            // Find the keypair for this wallet
            const keypair = keypairs.find(kp => 
              kp.publicKey.toString() === wallet.publicKey.toString()
            );

            if (!keypair) {
              throw new Error('Keypair not found');
            }

            await recoverTokens({
              publicKey: keypair.publicKey,
              secretKey: Array.from(keypair.secretKey)
            });

            setRecoveryStatus(prev => ({
              ...prev,
              successfulWallets: [...prev.successfulWallets, wallet.publicKey.toString()],
              totalRecovered: prev.totalRecovered + wallet.tribifyBalance,
              processed: prev.processed + 1
            }));

          } catch (error) {
            console.error(`Failed to recover from wallet ${wallet.publicKey.toString()}:`, error);
            setRecoveryStatus(prev => ({
              ...prev,
              failedWallets: [...prev.failedWallets, wallet.publicKey.toString()],
              processed: prev.processed + 1
            }));
          }
        }));

        // Wait between batches
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      await fetchBalances();
      showStatus(`Found ${walletsToRecover.length} wallets with tokens...`);
      showStatus(`Funding ${walletsThatNeedFunding.length} wallets...`);
      showStatus(`Processing batch ${Math.floor(recoveryStatus.processed / BATCH_SIZE) + 1} of ${Math.ceil(walletsToRecover.length / BATCH_SIZE)}...`);

    } catch (error) {
      console.error('Recovery process failed:', error);
      alert(error.message);
      showStatus(`Error: ${error.message}`, 5000);
    } finally {
      setRecoveryStatus(prev => ({ 
        ...prev, 
        isRecovering: false,
        inProgress: false 
      }));
    }
  };

  // Add SOL recovery function
  const recoverSOL = async (fromWallet) => {
    try {
      const connection = new Connection(
        `https://rpc.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_KEY}`,
        { commitment: 'confirmed' }
      );

      const balance = await connection.getBalance(fromWallet.publicKey);
      if (balance <= LAMPORTS_PER_SOL * 0.001) { // Leave enough for rent exemption
        return 0;
      }

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromWallet.publicKey,
          toPubkey: new PublicKey(window.phantom.solana.publicKey.toString()),
          lamports: balance - (LAMPORTS_PER_SOL * 0.001) // Leave 0.001 SOL
        })
      );

      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = fromWallet.publicKey;

      const keypair = Keypair.fromSecretKey(new Uint8Array(fromWallet.secretKey));
      transaction.sign(keypair);

      const signature = await connection.sendRawTransaction(transaction.serialize());
      await connection.confirmTransaction(signature);

      return (balance - (LAMPORTS_PER_SOL * 0.001)) / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('SOL recovery failed:', error);
      return 0;
    }
  };

  // Update the funding function
  const fundAllWallets = async () => {
    try {
      const transactions = [];
      const connection = new Connection(RPC_ENDPOINTS[0]);
      
      // Prepare all transactions first
      for (let i = 0; i < fundingModalState.numberOfWallets; i++) {
        const wallet = keypairs[i];
        const amount = fundingModalState.isRandomDistribution ?
          Math.random() * (fundingModalState.maxAmount - fundingModalState.minAmount) + fundingModalState.minAmount :
          fundingModalState.amountPerWallet;

        const transaction = new Transaction();
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(window.phantom.solana.publicKey.toString()),
            toPubkey: wallet.publicKey,
            lamports: Math.floor(amount * LAMPORTS_PER_SOL)
          })
        );

        transaction.feePayer = new PublicKey(window.phantom.solana.publicKey.toString());
        const signed = await window.phantom.solana.signTransaction(transaction);
        transactions.push(signed);
      }

      // Add to queue with progress callback
      setFundingModalState(prev => ({ ...prev, isFunding: true, fundedCount: 0 }));
      
      await txQueue.add(transactions, (processed) => {
        setFundingModalState(prev => ({
          ...prev,
          fundedCount: processed
        }));
      });

      await fetchBalances();
      alert('Successfully funded all wallets!');
      setIsFundingModalOpen(false);
    } catch (error) {
      console.error('Error funding wallets:', error);
      alert(`Failed to fund wallets: ${error.message}`);
    } finally {
      setFundingModalState(prev => ({ 
        ...prev, 
        isFunding: false,
        fundedCount: 0
      }));
    }
  };

  // Add useEffect to fetch parent SOL balance when modal opens
  useEffect(() => {
    if (isFundingModalOpen) {
      const fetchParentSOLBalance = async () => {
        try {
          const connection = getConnection();
          const balance = await connection.getBalance(
            new PublicKey(window.phantom.solana.publicKey.toString())
          );
          setFundingModalState(prev => ({ 
            ...prev, 
            parentSolBalance: balance / LAMPORTS_PER_SOL 
          }));
        } catch (error) {
          console.error('Error fetching parent SOL balance:', error);
        }
      };

      fetchParentSOLBalance();
    }
  }, [isFundingModalOpen]);

  // Add these helper functions before the WalletPage component
  const getJupiter = async (connection, keypair) => {
    const calculator = new QuoteCalculator({
      connection,
      cluster: 'mainnet-beta',
      routeCacheDuration: 10, // 10 second cache
      wrapUnwrapSOL: true,
      enableSwapModeV2: true
    });
    
    return calculator;
  };

  const createSwapTransaction = async (
    calculator,
    fromToken,
    toToken,
    amount,
    keypair,
    slippage = 1
  ) => {
    const inputMint = fromToken === 'SOL' ? NATIVE_MINT : 
                      fromToken === 'USDC' ? new PublicKey(USDC_MINT) :
                      new PublicKey(TRIBIFY_TOKEN_MINT);
    
    const outputMint = toToken === 'SOL' ? NATIVE_MINT :
                       toToken === 'USDC' ? new PublicKey(USDC_MINT) :
                       new PublicKey(TRIBIFY_TOKEN_MINT);

    // Get quote
    const quote = await calculator.getQuote({
      sourceMint: inputMint,
      destinationMint: outputMint,
      amount: toBigNumber(amount),
      slippageBps: slippage * 100,
    });

    if (!quote) {
      throw new Error('No routes found for swap');
    }

    // Create the swap transaction
    const swapTx = new Transaction();
    
    // Add swap instructions from quote
    quote.instructions.forEach(instruction => {
      swapTx.add(instruction);
    });

    // Add recent blockhash and sign
    const { blockhash } = await connection.getLatestBlockhash();
    swapTx.recentBlockhash = blockhash;
    swapTx.feePayer = keypair.publicKey;
    swapTx.sign(keypair);

    return swapTx;
  };

  // Update the handleMassConversion function
  const handleMassConversion = (fromToken, toToken) => {
    setConversionStatus({
      isConverting: true,
      fromToken,
      toToken
    });
  };

  // Add retry handler
  const handleRetryConversion = async () => {
    setConversionStatus(prev => ({
      ...prev,
      error: null,
      retryCount: prev.retryCount + 1,
      inProgress: true
    }));
    
    // Retry with 90% of the previous amount
    const retryAmount = conversionStatus.totalConverted * 0.9;
    await handleMassConversion(
      conversionStatus.fromToken, 
      conversionStatus.toToken, 
      retryAmount
    );
  };

  // Function to update subwallets
  const updateSubwallets = (newSubwallets) => {
    setSubwallets(newSubwallets);
    // Pass subwallets to App or a context
  };

  return (
    <Layout>
      <div className="wallet-page">
        <div className="wallet-modal">
          <div className="wallet-modal-header">
            <h2>Wallet Management</h2>
            <button className="close-button" onClick={() => navigate('/app')}>×</button>
          </div>
          
          <div className="wallet-modal-content">
            {/* Wallet actions */}
            <div className="wallet-actions">
              <button>Close Wallet</button>
              <button>Generate Keys</button>
              <button>Backup Keys</button>
              <button>Restore Keys</button>
              <button>⟳ Refresh Wallets</button>
              <button>Clear Storage & Reset</button>
            </div>

            {/* Trading actions */}
            <div className="trading-actions">
              <button>Fund Subwallets</button>
              <button>Distribute $TRIBIFY</button>
              <button>Configure Buy</button>
              <button>Buy Sequence</button>
              <button>Configure Sell</button>
              <button>Sell Sequence</button>
            </div>

            {/* Conversion sections */}
            <div className="conversion-sections">
              {/* TRIBIFY conversion */}
              <div className="conversion-group">
                <span>Convert ALL TRIBIFY to:</span>
                <button>SOL</button>
                <button>USDC</button>
              </div>

              {/* SOL conversion */}
              <div className="conversion-group">
                <span>Convert ALL SOL to:</span>
                <button>TRIBIFY</button>
                <button>USDC</button>
              </div>

              {/* USDC conversion */}
              <div className="conversion-group">
                <span>Convert ALL USDC to:</span>
                <button>TRIBIFY</button>
                <button>SOL</button>
              </div>
            </div>

            {/* Parent wallet info */}
            <div className="parent-wallet-info">
              <h3>Parent Wallet</h3>
              <div className="wallet-address">{parentWalletAddress}</div>
              {/* Balance info */}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default WalletPage; 