import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import CryptoJS from 'crypto-js';
import bs58 from 'bs58';
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction, 
  transfer,
  TOKEN_PROGRAM_ID 
} from '@solana/spl-token';
import './WalletPage.css';

const TOTAL_SUPPLY = 1_000_000_000; // 1 Billion tokens

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

function WalletPage() {
  const navigate = useNavigate();
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

  const TRIBIFY_TOKEN_MINT = "672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump";
  const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const HELIUS_RPC_URL = `https://rpc-devnet.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_API_KEY}`;
  const connection = new Connection(HELIUS_RPC_URL);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadStoredKeypairs = () => {
      try {
        if (!window.phantom?.solana?.publicKey) return;
        
        const encryptedData = localStorage.getItem('tribify_keypairs');
        if (!encryptedData) {
          console.log('No stored keypairs found');
          return;
        }

        console.log('Found encrypted data length:', encryptedData.length);
        console.log('First 50 chars of encrypted data:', encryptedData.substring(0, 50));

        const walletAddress = window.phantom.solana.publicKey.toString();
        console.log('Decrypting with wallet:', walletAddress);

        // Decrypt the data
        const decrypted = CryptoJS.AES.decrypt(encryptedData, walletAddress).toString(CryptoJS.enc.Utf8);
        
        const storedData = JSON.parse(decrypted);
        console.log('Successfully decrypted keypairs:', storedData.length);
        
        const loadedKeypairs = storedData.map(pair => 
          Keypair.fromSecretKey(new Uint8Array(pair.secretKey))
        );
        
        setKeypairs(loadedKeypairs);
        console.log('Loaded keypairs:', loadedKeypairs.length);
      } catch (error) {
        console.error('Failed to load stored keypairs:', error);
      }
    };

    loadStoredKeypairs();
  }, []);

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
    if (keypairs.length > 0) {
      alert('Keypairs already exist! Using existing keys to prevent loss of funds.');
      return;
    }

    try {
      setGenerating(true);
      console.log('Starting key generation...');
      
      const message = 'Generate HD wallet seed';
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await window.phantom.solana.signMessage(encodedMessage, 'utf8');
      
      const seedBytes = Uint8Array.from(signature.data || signature);
      console.log('Seed bytes:', seedBytes);
      
      const newKeypairs = [];
      
      for (let i = 0; i < 100; i++) {
        try {
          const path = `m/44'/501'/${i}'/0'`;
          const derivedBytes = derivePath(path, seedBytes).key;
          const keypair = Keypair.fromSeed(derivedBytes.slice(0, 32));
          newKeypairs.push(keypair);
        } catch (err) {
          console.error(`Failed to generate keypair ${i}:`, err);
        }
      }
      
      console.log('Generated keypairs:', newKeypairs.length);
      setKeypairs(newKeypairs);

    } catch (error) {
      console.error('Failed to generate keypairs:', error);
      alert('Failed to generate keys: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const downloadKeypairs = () => {
    try {
      const pairs = keypairs.map((kp, index) => ({
        index: index + 1,
        publicKey: kp.publicKey.toString(),
        privateKey: Buffer.from(kp.secretKey).toString('hex')
      }));

      const data = JSON.stringify({
        walletAddress: window.phantom.solana.publicKey.toString(),
        timestamp: new Date().toISOString(),
        keypairs: pairs
      }, null, 2);

      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tribify-keypairs.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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
  const randomizeConfig = () => {
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

  const FeatureExplanation = ({ type }) => {
    const features = {
      buy: {
        title: "Buy Configuration Features",
        features: [
          {
            title: "Amount Type Selection",
            description: "Choose between SOL, USDC, TRIBIFY, or CA (Contract Address) to specify how you want to denominate your purchases."
          },
          {
            title: "Wallet & Amount Settings",
            description: "Configure how many wallets to use (1-100) and set minimum/maximum purchase amounts for randomization."
          },
          {
            title: "Time Settings",
            description: "Schedule your buys by setting start/end times and intervals between transactions. This helps prevent detection and spreads out your purchases."
          },
          {
            title: "Transaction Settings",
            description: "Set slippage tolerance and priority fees. Enable random wallet order to further obscure the pattern of purchases."
          },
          {
            title: "Randomization",
            description: "The 🎲 Randomize button automatically generates random values within safe ranges for all settings."
          }
        ]
      },
      sell: {
        title: "Sell Configuration Features",
        features: [
          {
            title: "Amount Type Selection",
            description: "Choose between SOL, USDC, TRIBIFY, or CA (Contract Address) to specify how you want to denominate your sales."
          },
          {
            title: "Wallet & Amount Settings",
            description: "Configure how many wallets to use (1-100) and set minimum/maximum sale amounts for randomization."
          },
          {
            title: "Time Settings",
            description: "Schedule your sells by setting start/end times and intervals between transactions. This helps prevent detection and spreads out your sales."
          },
          {
            title: "Transaction Settings",
            description: "Set slippage tolerance and priority fees. Enable random wallet order to further obscure the pattern of sales."
          },
          {
            title: "Randomization",
            description: "The 🎲 Randomize button automatically generates random values within safe ranges for all settings."
          }
        ]
      }
    };

    const content = features[type];

    return (
      <div className="explanation-panel">
        <h2>{content.title}</h2>
        {content.features.map((feature, index) => (
          <div key={index} className="feature-explanation">
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        ))}
      </div>
    );
  };

  const calculateTotals = () => {
    return keypairs.reduce((totals, keypair) => {
      return {
        sol: totals.sol + (keypair.solBalance || 0),
        usdc: totals.usdc + (keypair.usdcBalance || 0),
        tribify: totals.tribify + (keypair.tribifyBalance || 0)
      };
    }, { sol: 0, usdc: 0, tribify: 0 });
  };

  const fetchBalances = async () => {
    if (keypairs.length === 0) return;
    
    setIsLoading(true);
    try {
      const updatedKeypairs = await Promise.all(keypairs.map(async (keypair) => {
        try {
          // Fetch SOL balance
          const solBalance = await connection.getBalance(keypair.publicKey);
          
          // Fetch USDC balance
          let usdcBalance = 0;
          try {
            const ata = await getAssociatedTokenAddress(
              new PublicKey(USDC_MINT),
              keypair.publicKey
            );
            const account = await connection.getTokenAccountBalance(ata);
            usdcBalance = account.value.uiAmount || 0;
          } catch (e) {
            console.log('No USDC account for:', keypair.publicKey.toString());
          }

          return {
            ...keypair,
            solBalance: solBalance / LAMPORTS_PER_SOL,
            usdcBalance
          };
        } catch (e) {
          console.error('Error fetching balances:', e);
          return keypair;
        }
      }));
      
      setKeypairs(updatedKeypairs);
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (keypairs.length > 0) {
      fetchBalances();
    }
  }, [keypairs.length]);

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

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const keys = JSON.parse(text);
      
      // Validate and convert the keys to Keypairs
      const restoredKeypairs = keys.map(key => {
        try {
          // Handle both string and array formats
          const secretKey = typeof key === 'string' ? 
            new Uint8Array(Buffer.from(key, 'hex')) :
            new Uint8Array(key);
          return Keypair.fromSecretKey(secretKey);
        } catch (e) {
          console.error('Invalid key format:', e);
          return null;
        }
      }).filter(Boolean); // Remove any invalid keys

      if (restoredKeypairs.length > 0) {
        setKeypairs(restoredKeypairs);
        setStatus(`Successfully restored ${restoredKeypairs.length} keys`);
      } else {
        setStatus('No valid keys found in file');
      }
    } catch (e) {
      console.error('Error restoring keys:', e);
      setStatus('Error restoring keys: Invalid file format');
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

  return (
    <div className="wallet-fullscreen">
      {notification && (
        <div className="copy-notification">
          {notification}
        </div>
      )}
      <div className="wallet-content">
        <div className="wallet-header">
          <div className="wallet-controls">
            <button onClick={generateHDWallet} disabled={generating}>
              {generating ? 'Generating...' : 'Generate Keys'}
            </button>
            <button onClick={downloadKeypairs} disabled={keypairs.length === 0}>
              Download Keys
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="restore-button"
            >
              Restore Keys
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="application/json"
              style={{ display: 'none' }}
            />
            <button 
              className="refresh-button"
              onClick={fetchBalances}
              disabled={keypairs.length === 0 || isLoading}
            >
              Refresh
            </button>
            <button 
              className="fund-button"
              onClick={() => setIsFundingModalOpen(true)}
            >
              Fund Wallets
            </button>
            <button onClick={() => setIsBuyModalOpen(true)}>Configure Buy</button>
            <button className="buy-all">Trigger Buy Config</button>
            <button onClick={() => setIsSellModalOpen(true)}>Configure Sell</button>
            <button className="sell-all">Trigger Sell Config</button>
            <button onClick={() => navigate(-1)} className="close-button">Close Wallet</button>
          </div>
        </div>

        <div className="parent-wallet-info">
          <span className="label">Parent Wallet:</span>
          <span className="address">{parentWalletAddress || 'Not Connected'}</span>
        </div>

        <div className="wallet-table">
          <div className="table-header">
            <div className="col-index">#</div>
            <div className="col-private">Private Key</div>
            <div className="col-public">Public Key</div>
            <div className="col-tribify">TRIBIFY</div>
            <div className="col-sol">SOL</div>
            <div className="col-usdc">USDC</div>
            <div className="col-message">Message</div>
          </div>
          
          <div className="table-row totals-row">
            <div className="col-index">0</div>
            <div className="col-private">CUMULATIVE BALANCE</div>
            <div className="col-public"></div>
            <div className="col-tribify total-value">
              {calculateTotals().tribify} TRIBIFY
            </div>
            <div className="col-sol total-value">
              {calculateTotals().sol.toFixed(4)} SOL
            </div>
            <div className="col-usdc total-value">
              ${calculateTotals().usdc.toFixed(2)}
            </div>
            <div className="col-message">
              {contractAddress || '-'}
            </div>
          </div>

          {keypairs.map((keypair, i) => (
            <div key={i} className="table-row">
              <div className="col-index">{i + 1}</div>
              <div 
                className={`col-private ${copiedStates[`private-${i}`] ? 'copied' : ''}`}
                onClick={() => copyToClipboard(Buffer.from(keypair.secretKey).toString('hex'), i, 'private')}
              >
                {Buffer.from(keypair.secretKey).toString('hex')}
              </div>
              <div 
                className={`col-public ${copiedStates[`public-${i}`] ? 'copied' : ''}`}
                onClick={() => copyToClipboard(keypair.publicKey.toString(), i, 'public')}
              >
                {keypair.publicKey.toString()}
              </div>
              <div className="col-tribify">
                {keypair.tribifyBalance || 0} TRIBIFY
              </div>
              <div className="col-sol">
                {(keypair.solBalance || 0).toFixed(4)} SOL
              </div>
              <div className="col-usdc">
                ${(keypair.usdcBalance || 0).toFixed(2)}
              </div>
              <div className="col-message">
                {contractAddress || '-'}
              </div>
            </div>
          ))}
        </div>

        {/* Buy Configuration Modal */}
        {isBuyModalOpen && (
          <div className="buy-config-modal">
            <div className="left-side">
              <FeatureExplanation type="buy" />
            </div>
            <div className="right-side">
              <div className="dialog-box">
                <div className="dialog-content">
                  <div className="dialog-header">
                    <h3>Configure Automated Buying Sequence</h3>
                    <div className="header-buttons">
                      <button 
                        className="randomize-button"
                        onClick={randomizeConfig}
                        title="Generate random configuration"
                      >
                        🎲 Randomize
                      </button>
                      <button 
                        className="save-button"
                        onClick={() => {
                          // Save configuration logic here (e.g., local storage or state)
                          setIsBuyModalOpen(false);
                        }}
                      >
                        Save Config
                      </button>
                      <button 
                        className="buy-button"
                        onClick={() => {
                          // Schedule automated buying
                          buyAndDistribute();
                          setIsBuyModalOpen(false);
                          setStatus('Automated buying has been started.');
                        }}
                      >
                        Start Buying
                      </button>
                    </div>
                  </div>
                  <div className="right-side-content">
                    <div className="form-field">
                      <div className="radio-group">
                        <label>
                          <input 
                            type="radio" 
                            name="amountType" 
                            checked={selectedAmountType === 'SOL'}
                            onChange={() => {
                              setSelectedAmountType('SOL');
                              setShowCAInput(false);
                              setBuyConfig({ ...buyConfig, denominationType: 'SOL' });
                            }} 
                          /> SOL
                        </label>
                        <label>
                          <input 
                            type="radio" 
                            name="amountType" 
                            checked={selectedAmountType === 'USDC'}
                            onChange={() => {
                              setSelectedAmountType('USDC');
                              setShowCAInput(false);
                              setBuyConfig({ ...buyConfig, denominationType: 'USDC' });
                            }} 
                          /> USDC
                        </label>
                        <label>
                          <input 
                            type="radio" 
                            name="amountType" 
                            checked={selectedAmountType === 'TRIBIFY'}
                            onChange={() => {
                              setSelectedAmountType('TRIBIFY');
                              setShowCAInput(false);
                              setBuyConfig({ ...buyConfig, denominationType: 'TRIBIFY' });
                            }} 
                          /> TRIBIFY
                        </label>
                        <label>
                          <input 
                            type="radio" 
                            name="amountType" 
                            checked={selectedAmountType === 'CA'}
                            onChange={() => {
                              setSelectedAmountType('CA');
                              setShowCAInput(true);
                              setBuyConfig({ ...buyConfig, denominationType: 'CA' });
                            }} 
                          /> CA
                        </label>
                      </div>
                    </div>
                  </div>
                  {showCAInput && (
                    <div className="ca-input-container">
                      <input
                        type="text"
                        value={caValue}
                        onChange={(e) => setCAValue(e.target.value)}
                        placeholder="Paste contract address here..."
                        className="ca-input"
                      />
                      <button 
                        className="save-ca-button"
                        onClick={() => {
                          // Save CA logic here
                          console.log('Saving CA:', caValue);
                          setBuyConfig({ ...buyConfig, contractAddress: caValue });
                          // You can add validation and storage logic here
                        }}
                      >
                        Save CA
                      </button>
                    </div>
                  )}
                  <div className="buy-form">
                    {/* Wallet and Amount Section */}
                    <div className="form-section">
                      <div className="form-section-title">Wallet & Amount Settings</div>
                      <div className="wallet-amount-section">
                        <div className="form-field">
                          <label>Number of Wallets (1-100)</label>
                          <input type="number" {...walletCountProps} />
                        </div>
                        <div className="form-field">
                          <label>Min Amount</label>
                          <input type="number" {...minAmountProps} />
                        </div>
                        <div className="form-field">
                          <label>Max Amount</label>
                          <input type="number" {...maxAmountProps} />
                        </div>
                      </div>
                    </div>

                    {/* Time Settings Section */}
                    <div className="form-section">
                      <div className="form-section-title">Time Settings</div>
                      <div className="time-settings">
                        <div className="form-field">
                          <label>Start Time</label>
                          <input type="datetime-local" {...startTimeProps} />
                        </div>
                        <div className="form-field">
                          <label>End Time</label>
                          <input type="datetime-local" {...endTimeProps} />
                        </div>
                        <div className="form-field">
                          <label>Min Interval (seconds)</label>
                          <input type="number" {...minIntervalProps} />
                        </div>
                        <div className="form-field">
                          <label>Max Interval (seconds)</label>
                          <input type="number" {...maxIntervalProps} />
                        </div>
                      </div>
                    </div>

                    {/* Transaction Settings Section */}
                    <div className="form-section">
                      <div className="form-section-title">Transaction Settings</div>
                      <div className="transaction-settings">
                        <div className="form-field">
                          <label>Slippage (%)</label>
                          <input type="number" {...slippageProps} />
                        </div>
                        <div className="form-field">
                          <label>Priority Fee (SOL)</label>
                          <input type="number" {...priorityFeeProps} />
                        </div>
                        <div className="form-field">
                          <label className="checkbox-label">
                            <input 
                              type="checkbox" 
                              checked={buyConfig.randomOrder}
                              onChange={(e) => setBuyConfig({
                                ...buyConfig,
                                randomOrder: e.target.checked
                              })}
                            />
                            Randomize Wallet Order
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Budget Section in Buy Modal */}
                    <div className="form-section">
                      <div className="form-section-title">Budget</div>
                      <div className="budget-settings">
                        <div className="form-field">
                          <label>Maximum Budget ({buyConfig.denominationType})</label>
                          <input 
                            type="number"
                            value={buyConfig.budget}
                            onChange={(e) => setBuyConfig({
                              ...buyConfig,
                              budget: parseFloat(e.target.value)
                            })}
                            min="0"
                            step="0.1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="dialog-note">
                    Will automatically buy random amounts between {buyConfig.minAmount} and {buyConfig.maxAmount} {buyConfig.denominatedInSol ? 'SOL' : 'TRIBIFY'} 
                    using {buyConfig.walletCount} wallet{buyConfig.walletCount > 1 ? 's' : ''}<br/>
                    Buys will occur between {buyConfig.startTime ? new Date(buyConfig.startTime).toLocaleString() : '(not set)'} 
                    and {buyConfig.endTime ? new Date(buyConfig.endTime).toLocaleString() : '(not set)'}<br/>
                    with {buyConfig.minInterval}-{buyConfig.maxInterval} minute intervals between transactions
                    {buyConfig.randomOrder && ' in random wallet order'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sell Configuration Modal */}
        {isSellModalOpen && (
          <div className="modal-container">
            <h3>Configure Automated Selling Sequence</h3>
            <div className="modal-content">
              <p>Set up your automated selling parameters here.</p>
              <div className="form-section">
                <div className="form-field">
                  <label>Minimum Sell Amount</label>
                  <input type="number" placeholder="Enter minimum amount" />
                </div>
                <div className="form-field">
                  <label>Maximum Sell Amount</label>
                  <input type="number" placeholder="Enter maximum amount" />
                </div>
                <div className="form-field">
                  <label>Sell Interval (seconds)</label>
                  <input type="number" placeholder="Enter interval" />
                </div>
              </div>
              <button onClick={() => setIsSellModalOpen(false)}>Close</button>
            </div>
          </div>
        )}

        {/* Add Funding Modal */}
        {isFundingModalOpen && (
          <div className="modal-container">
            <div className="modal-content">
              <div className="dialog-box">
                <div className="dialog-content">
                  <div className="dialog-header">
                    <h3>Fund Wallets</h3>
                  </div>
                  
                  {/* Add explanation section */}
                  <div className="explanation-box">
                    <div className="explanation-title">
                      <i className="info-icon">ℹ️</i>
                      <span>How Wallet Funding Works</span>
                    </div>
                    <div className="explanation-content">
                      <p>
                        This feature allows you to fund multiple micro-position wallets from a single funding source:
                      </p>
                      <ul>
                        <li>Use a separate funding wallet to distribute funds across your generated wallets</li>
                        <li>Funds will be distributed in random amounts to {keypairs.length} generated wallets</li>
                        <li>Random distribution enhances privacy by diversifying transaction patterns</li>
                        <li>Total amount to distribute: {fundingConfig.amount} {fundingConfig.currency}</li>
                        <li>This approach maintains privacy by separating your funding source from your trading wallets</li>
                      </ul>
                    </div>
                  </div>

                  <div className="funding-settings">
                    <div className="form-field">
                      <label>Amount to Distribute</label>
                      <input 
                        type="number"
                        value={fundingConfig.amount}
                        onChange={(e) => setFundingConfig({
                          ...fundingConfig,
                          amount: parseFloat(e.target.value)
                        })}
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <div className="form-field">
                      <label>Currency</label>
                      <select
                        value={fundingConfig.currency}
                        onChange={(e) => setFundingConfig({
                          ...fundingConfig,
                          currency: e.target.value
                        })}
                      >
                        <option value="SOL">SOL</option>
                        <option value="USDC">USDC</option>
                      </select>
                    </div>
                    <div className="form-field funding-wallet">
                      <label>Funding Wallet</label>
                      <div className="wallet-input-group">
                        <input
                          type="text"
                          placeholder="Public Key"
                          value={fundingConfig.fundingWallet?.publicKey || ''}
                          readOnly
                        />
                        <input
                          type="password"
                          placeholder="Private Key"
                          value={fundingConfig.fundingWallet?.secretKey || ''}
                          onChange={(e) => {
                            try {
                              const secretKey = bs58.decode(e.target.value);
                              const keypair = Keypair.fromSecretKey(secretKey);
                              setFundingConfig({
                                ...fundingConfig,
                                fundingWallet: {
                                  publicKey: keypair.publicKey.toString(),
                                  secretKey: e.target.value
                                }
                              });
                            } catch (error) {
                              console.error('Invalid private key');
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="dialog-summary">
                    Total amount to distribute: {fundingConfig.amount} {fundingConfig.currency}<br/>
                    Amount per wallet: {fundingConfig.amount > 0 ? 
                      (fundingConfig.amount / keypairs.length).toFixed(4) : '0'} {fundingConfig.currency}
                  </div>

                  <div className="dialog-buttons">
                    <button onClick={() => distributeFunds()}>Start Funding</button>
                    <button onClick={() => setIsFundingModalOpen(false)}>Close</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WalletPage; 