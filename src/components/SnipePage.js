import React, { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import './SnipePage.css';

function SnipeModal({ isOpen, onClose, targetCA, excludedWallets, onStartSnipe }) {
  const [config, setConfig] = useState({
    buyAmount: '0.1',
    maxBuyTax: '10',
    maxSellTax: '10',
    buySlippage: '1',
    sellSlippage: '1',
    priorityFee: '0.000005',
    antiRug: true,
    maxMC: '1000000',
    autoBuyAmount: '0.1',
    autoSellAt: '2',
    stopLossAt: '0.5',
    retryCount: '3',
    retryDelay: '1',
    maxGas: '0.01',
    buyDelay: '0',
    distributeAmount: true
  });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="snipe-modal">
        <div className="modal-header">
          <h3>Snipe Configuration</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="modal-section">
            <h4>Target Info</h4>
            <div className="info-row">
              <span>Contract Address:</span>
              <span className="mono">{targetCA}</span>
            </div>
            <div className="info-row">
              <span>Excluded Wallets:</span>
              <span>{excludedWallets.size}</span>
            </div>
          </div>

          <div className="modal-section">
            <h4>Buy Settings</h4>
            <div className="settings-row">
              <div className="setting-field">
                <label>Buy Amount (SOL)</label>
                <input
                  type="number"
                  value={config.buyAmount}
                  onChange={(e) => setConfig({...config, buyAmount: e.target.value})}
                  placeholder="0.1"
                />
              </div>
              <div className="setting-field">
                <label>Buy Delay (ms)</label>
                <input
                  type="number"
                  value={config.buyDelay}
                  onChange={(e) => setConfig({...config, buyDelay: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div className="setting-field">
                <label>Priority Fee</label>
                <input
                  type="number"
                  value={config.priorityFee}
                  onChange={(e) => setConfig({...config, priorityFee: e.target.value})}
                  placeholder="0.000005"
                />
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h4>Protection Settings</h4>
            <div className="settings-row">
              <div className="setting-field">
                <label>Max Buy Tax %</label>
                <input
                  type="number"
                  value={config.maxBuyTax}
                  onChange={(e) => setConfig({...config, maxBuyTax: e.target.value})}
                  placeholder="10"
                />
              </div>
              <div className="setting-field">
                <label>Max Sell Tax %</label>
                <input
                  type="number"
                  value={config.maxSellTax}
                  onChange={(e) => setConfig({...config, maxSellTax: e.target.value})}
                  placeholder="10"
                />
              </div>
              <div className="setting-field">
                <label>Max Market Cap</label>
                <input
                  type="number"
                  value={config.maxMC}
                  onChange={(e) => setConfig({...config, maxMC: e.target.value})}
                  placeholder="1000000"
                />
              </div>
            </div>
            <div className="settings-row">
              <div className="setting-field">
                <label>Max Gas (SOL)</label>
                <input
                  type="number"
                  value={config.maxGas}
                  onChange={(e) => setConfig({...config, maxGas: e.target.value})}
                  placeholder="0.01"
                />
              </div>
              <div className="setting-field checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={config.antiRug}
                    onChange={(e) => setConfig({...config, antiRug: e.target.checked})}
                  />
                  Anti-Rug Protection
                </label>
              </div>
              <div className="setting-field checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={config.distributeAmount}
                    onChange={(e) => setConfig({...config, distributeAmount: e.target.checked})}
                  />
                  Distribute Amount
                </label>
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h4>Auto-Sell Settings</h4>
            <div className="settings-row">
              <div className="setting-field">
                <label>Take Profit At (x)</label>
                <input
                  type="number"
                  value={config.autoSellAt}
                  onChange={(e) => setConfig({...config, autoSellAt: e.target.value})}
                  placeholder="2"
                />
              </div>
              <div className="setting-field">
                <label>Stop Loss At (x)</label>
                <input
                  type="number"
                  value={config.stopLossAt}
                  onChange={(e) => setConfig({...config, stopLossAt: e.target.value})}
                  placeholder="0.5"
                />
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h4>Retry Settings</h4>
            <div className="settings-row">
              <div className="setting-field">
                <label>Retry Count</label>
                <input
                  type="number"
                  value={config.retryCount}
                  onChange={(e) => setConfig({...config, retryCount: e.target.value})}
                  placeholder="3"
                />
              </div>
              <div className="setting-field">
                <label>Retry Delay (sec)</label>
                <input
                  type="number"
                  value={config.retryDelay}
                  onChange={(e) => setConfig({...config, retryDelay: e.target.value})}
                  placeholder="1"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>Cancel</button>
          <button 
            className="start-button"
            onClick={() => {
              onStartSnipe(config);
              onClose();
            }}
          >
            Start Sniping
          </button>
        </div>
      </div>
    </div>
  );
}

function SnipePage({ publicKey, parentBalance, subwallets = [] }) {
  const [targetCA, setTargetCA] = useState('');
  const [slippage, setSlippage] = useState('1');
  const [priorityFee, setPriorityFee] = useState('0.000005');
  const [status, setStatus] = useState('ready');
  const [excludedWallets, setExcludedWallets] = useState(new Set());
  const [walletBalances, setWalletBalances] = useState({});
  const [walletTokenBalances, setWalletTokenBalances] = useState({});
  const [tokenPrice, setTokenPrice] = useState(null);
  const [monitoringInterval, setMonitoringInterval] = useState(null);

  // New state for token info
  const [tokenInfo, setTokenInfo] = useState(null);
  const [isSetup, setIsSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Update RPC endpoints with more reliable options and proper URLs
  const RPC_ENDPOINTS = [
    process.env.REACT_APP_HELIUS_RPC,  // Primary (Helius)
    'https://api.mainnet-beta.solana.com',  // Official
    'https://solana-mainnet.g.alchemy.com/v2/demo',  // Alchemy Demo
    'https://api.mainnet.rpcpool.com/2b3a6c', // RPCPool
    'https://solana-api.projectserum.com'   // Serum
  ].filter(Boolean); // Remove any undefined endpoints

  const [currentRpcIndex, setCurrentRpcIndex] = useState(0);
  
  useEffect(() => {
    // Log available RPC endpoints on component mount
    console.log('Available RPC endpoints:', {
      helius: process.env.REACT_APP_HELIUS_RPC ? 'Configured' : 'Not configured',
      totalEndpoints: RPC_ENDPOINTS.length,
      currentEndpoint: RPC_ENDPOINTS[currentRpcIndex].includes('api-key') 
        ? RPC_ENDPOINTS[currentRpcIndex].split('api-key=')[0] + 'api-key=***'
        : RPC_ENDPOINTS[currentRpcIndex]
    });
  }, [currentRpcIndex]);

  const getConnection = useCallback(() => {
    return new Connection(RPC_ENDPOINTS[currentRpcIndex], {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
      wsEndpoint: undefined, // Disable WebSocket
      fetch: (url, options) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        return fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            ...options?.headers,
            'Content-Type': 'application/json',
          }
        }).finally(() => clearTimeout(timeoutId));
      }
    });
  }, [currentRpcIndex]);

  const tryNextRpc = useCallback(() => {
    const nextIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
    console.log(`Switching RPC from ${
      RPC_ENDPOINTS[currentRpcIndex].includes('api-key')
        ? RPC_ENDPOINTS[currentRpcIndex].split('api-key=')[0] + 'api-key=***'
        : RPC_ENDPOINTS[currentRpcIndex]
    } to ${
      RPC_ENDPOINTS[nextIndex].includes('api-key')
        ? RPC_ENDPOINTS[nextIndex].split('api-key=')[0] + 'api-key=***'
        : RPC_ENDPOINTS[nextIndex]
    }`);
    setCurrentRpcIndex(nextIndex);
    return getConnection();
  }, [currentRpcIndex, getConnection]);

  const testRpcConnection = async () => {
    let attempts = 0;
    const maxAttempts = RPC_ENDPOINTS.length * 2; // Try each endpoint up to twice
    
    while (attempts < maxAttempts) {
      try {
        const connection = getConnection();
        const currentEndpoint = RPC_ENDPOINTS[currentRpcIndex];
        
        console.log(`Testing RPC connection (Attempt ${attempts + 1}/${maxAttempts}):`, 
          currentEndpoint.includes('api-key') 
            ? currentEndpoint.split('api-key=')[0] + 'api-key=***' 
            : currentEndpoint
        );
        
        // Test with a simpler method first
        let slot;
        try {
          slot = await connection.getSlot('confirmed');
          console.log('Initial connection test successful, slot:', slot);
        } catch (err) {
          console.error('Failed initial connection test:', err.message);
          throw err;
        }
        
        // If initial test passes, try more comprehensive tests
        try {
          const [recentBlockhash, blockHeight] = await Promise.all([
            connection.getLatestBlockhash('confirmed'),
            connection.getBlockHeight('confirmed')
          ]);
          
          console.log('RPC connection fully verified:', {
            slot,
            blockHeight,
            blockhash: recentBlockhash.blockhash.slice(0, 10) + '...',
            endpoint: currentEndpoint.includes('api-key')
              ? currentEndpoint.split('api-key=')[0] + 'api-key=***'
              : currentEndpoint
          });
          
          return connection;
        } catch (err) {
          console.warn('Secondary connection tests failed:', err.message);
          // Still return connection if we at least got the slot
          return connection;
        }
      } catch (err) {
        console.error(`RPC connection failed (${
          RPC_ENDPOINTS[currentRpcIndex].includes('api-key')
            ? RPC_ENDPOINTS[currentRpcIndex].split('api-key=')[0] + 'api-key=***'
            : RPC_ENDPOINTS[currentRpcIndex]
        }):`, err.message);
        
        // If we've tried all endpoints once and are starting second round
        if (attempts >= RPC_ENDPOINTS.length) {
          // Add delay before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Try next RPC endpoint
        tryNextRpc();
        attempts++;
      }
    }
    
    throw new Error(`Unable to establish a reliable connection to the Solana network after ${attempts} attempts. Please ensure you have a stable internet connection and try again.`);
  };

  // Fetch balances for all wallets
  useEffect(() => {
    const fetchBalances = async () => {
      if (!publicKey) return;

      const balances = {};
      try {
        // Get a connection instance
        const connection = getConnection();
        
        // Parent wallet
        balances[publicKey] = parentBalance * LAMPORTS_PER_SOL;
        
        // Subwallets
        if (subwallets && subwallets.length > 0) {
          for (const wallet of subwallets) {
            if (wallet && wallet.publicKey) {
              try {
                const balance = await connection.getBalance(wallet.publicKey);
                balances[wallet.publicKey.toString()] = balance;
              } catch (err) {
                console.error(`Error fetching balance for ${wallet.publicKey.toString()}: `, err);
                balances[wallet.publicKey.toString()] = 0;
              }
            }
          }
        }
        setWalletBalances(balances);
      } catch (error) {
        console.error('Error fetching balances:', error);
      }
    };
    fetchBalances();
  }, [publicKey, subwallets, parentBalance, getConnection]);

  const toggleWalletExclusion = (walletAddress) => {
    setExcludedWallets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(walletAddress)) {
        newSet.delete(walletAddress);
      } else {
        newSet.add(walletAddress);
      }
      return newSet;
    });
  };

  const handleStartSnipe = () => {
    if (!targetCA.trim()) {
      console.error('No CA provided');
      return;
    }

    setIsModalOpen(true);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSnipeConfig = async (config) => {
    console.log('handleSnipeConfig called with config:', config);
    
    if (!targetCA.trim()) {
      console.error('No CA provided');
      return;
    }

    try {
      console.log('CA validated successfully, updating status');

      // Update status to sniping
      setStatus('sniping');

      console.log('Starting price monitoring');

      // Start price monitoring with config
      const intervalId = setInterval(() => monitorPrice(), 1000);
      setMonitoringInterval(intervalId);

    } catch (error) {
      console.error('Error in handleSnipeConfig:', error);
      alert('Error starting snipe: ' + error.message);
    }
  };

  const stopSniping = () => {
    // Clear monitoring interval
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      setMonitoringInterval(null);
    }

    // Reset status
    setStatus('ready');
  };

  const monitorPrice = async () => {
    try {
      const response = await fetch(`https://quote-api.jup.ag/v4/price?ids=${targetCA}`);
      const data = await response.json();
      const price = data?.[targetCA]?.price;
      
      setTokenPrice(price);

      // If price exists and we weren't monitoring before, token is live
      if (price && !tokenPrice) {
        executeBuy();
      }
    } catch (error) {
      console.error('Error monitoring price:', error);
    }
  };

  const executeBuy = async () => {
    try {
      // Prepare Jupiter swap parameters
      const swapParams = {
        inputMint: 'So11111111111111111111111111111111111111112', // SOL
        outputMint: targetCA,
        amount: LAMPORTS_PER_SOL * 0.1, // Example: 0.1 SOL per trade
        slippageBps: parseInt(slippage * 100),
        priorityFee: parseInt(priorityFee * LAMPORTS_PER_SOL)
      };

      // Execute swap through Jupiter (you'll need to implement the actual swap)
      // This is a placeholder for the actual implementation
      console.log('Executing buy for target:', targetCA, 'with params:', swapParams);

      // Update status to success after buy
      setStatus('success');

    } catch (error) {
      console.error('Error executing buy:', error);
      // Update status to error
      setStatus('error');
    }
  };

  const fetchTokenInfo = async () => {
    if (!targetCA.trim()) return;

    setIsLoading(true);
    try {
      // Validate CA format first
      let mintPubkey;
      try {
        mintPubkey = new PublicKey(targetCA);
        console.log('Valid Solana address format:', mintPubkey.toString());
      } catch (err) {
        console.error('Invalid address error:', err);
        throw new Error('Invalid Solana address format. Please check the address.');
      }

      // Test RPC connection and get a working connection
      let connection;
      try {
        connection = await testRpcConnection();
      } catch (err) {
        throw new Error('Unable to establish connection to Solana network. Please check your internet connection or try again later.');
      }

      // Fetch basic token info from Solana
      try {
        console.log('Fetching token info for:', mintPubkey.toString());
        const tokenInfoResponse = await connection.getParsedAccountInfo(mintPubkey);
        
        if (!tokenInfoResponse?.value) {
          throw new Error('Token not found on Solana. Please verify the contract address.');
        }
        
        // Check if it's actually a token account
        const accountData = tokenInfoResponse.value.data;
        if (!accountData || accountData.program !== 'spl-token') {
          throw new Error('Invalid token address. This address is not an SPL token.');
        }
        
        console.log('Solana token info:', tokenInfoResponse);
      } catch (err) {
        console.error('Solana token fetch error:', err);
        if (err.message.includes('rate limit')) {
          tryNextRpc();
          throw new Error('RPC rate limit reached. Switching to backup RPC. Please try again.');
        } else {
          throw new Error(`Failed to fetch token info: ${err.message}`);
        }
      }

      // Fetch Jupiter price data
      let jupiterData;
      try {
        const jupiterResponse = await fetch(`https://price.jup.ag/v4/price?ids=${targetCA}`);
        jupiterData = await jupiterResponse.json();
        console.log('Jupiter price data:', jupiterData);
      } catch (err) {
        console.error('Jupiter API error:', err);
        throw new Error('Failed to fetch price from Jupiter');
      }

      // Fetch Birdeye data
      let birdeyeData;
      const BIRDEYE_API_KEY = process.env.REACT_APP_BIRDEYE_API_KEY;
      
      if (BIRDEYE_API_KEY) {
        try {
          console.log('Fetching Birdeye data with API key:', BIRDEYE_API_KEY.slice(0, 4) + '...');
          const birdeyeResponse = await fetch(`https://public-api.birdeye.so/public/token_info?address=${targetCA}`, {
            headers: {
              'X-API-KEY': BIRDEYE_API_KEY,
              'Accept': 'application/json'
            }
          });
          
          if (!birdeyeResponse.ok) {
            throw new Error(`Birdeye API error: ${birdeyeResponse.status} ${birdeyeResponse.statusText}`);
          }
          
          birdeyeData = await birdeyeResponse.json();
          console.log('Birdeye data:', birdeyeData);

          if (birdeyeData.success === false) {
            console.warn('Birdeye API returned error:', birdeyeData.message || 'Unknown error');
          }
        } catch (err) {
          console.error('Birdeye API error:', err);
          if (err.message.includes('401')) {
            console.error('Invalid Birdeye API key. Please check your API key.');
          }
          birdeyeData = { data: {} };
        }
      } else {
        console.warn('No Birdeye API key provided in environment variables (REACT_APP_BIRDEYE_API_KEY)');
        birdeyeData = { data: {} };
      }

      setTokenInfo({
        name: birdeyeData?.data?.name || 'Unknown Token',
        symbol: birdeyeData?.data?.symbol || '???',
        price: jupiterData?.data?.[targetCA]?.price || 0,
        volume24h: birdeyeData?.data?.volume24h || 0,
        liquidity: birdeyeData?.data?.liquidity || 0,
        holders: birdeyeData?.data?.holders || 0,
        marketCap: birdeyeData?.data?.marketCap || 0,
        isValid: true
      });

      setIsSetup(true);
    } catch (error) {
      console.error('Token fetch error:', error);
      alert(error.message || 'Error fetching token information. Please check the contract address.');
      setTokenInfo(null);
      setIsSetup(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="snipe-container">
      <div className="snipe-header">
        <h2 className="snipe-title">Token Sniper</h2>
        
        {/* Target CA Settings */}
        <div className="settings-section">
          <div className="target-settings">
            <div className="setting-field">
              <label htmlFor="contract-address">Contract Address</label>
              <input 
                id="contract-address"
                name="contract-address"
                type="text" 
                value={targetCA}
                onChange={(e) => setTargetCA(e.target.value)}
                placeholder="Enter CA"
                className="ca-input"
                aria-label="Contract Address"
              />
            </div>
            <button 
              className="setup-button"
              disabled={!targetCA.trim() || isLoading}
              onClick={fetchTokenInfo}
            >
              {isLoading ? 'Loading...' : 'Setup Sniper'}
            </button>

            {tokenInfo && (
              <div className="token-info">
                <div className="token-header">
                  <h3>{tokenInfo.name} ({tokenInfo.symbol})</h3>
                  <div className="token-price" role="status" aria-label="Token Price">
                    ${tokenInfo.price.toFixed(6)}
                  </div>
                </div>
                <div className="token-stats">
                  <div className="stat-item">
                    <label id="volume-label">24h Volume</label>
                    <div aria-labelledby="volume-label">${tokenInfo.volume24h.toLocaleString()}</div>
                  </div>
                  <div className="stat-item">
                    <label id="liquidity-label">Liquidity</label>
                    <div aria-labelledby="liquidity-label">${tokenInfo.liquidity.toLocaleString()}</div>
                  </div>
                  <div className="stat-item">
                    <label id="holders-label">Holders</label>
                    <div aria-labelledby="holders-label">{tokenInfo.holders.toLocaleString()}</div>
                  </div>
                  <div className="stat-item">
                    <label id="mcap-label">Market Cap</label>
                    <div aria-labelledby="mcap-label">${tokenInfo.marketCap.toLocaleString()}</div>
                  </div>
                </div>

                <div className="snipe-settings">
                  <div className="setting-field">
                    <label htmlFor="slippage">Slippage %</label>
                    <input 
                      id="slippage"
                      name="slippage"
                      type="number" 
                      value={slippage}
                      onChange={(e) => setSlippage(e.target.value)}
                      placeholder="1"
                      min="0"
                      step="0.1"
                      aria-label="Slippage Percentage"
                    />
                  </div>
                  <div className="setting-field">
                    <label htmlFor="priority-fee">Priority Fee</label>
                    <input 
                      id="priority-fee"
                      name="priority-fee"
                      type="number" 
                      value={priorityFee}
                      onChange={(e) => setPriorityFee(e.target.value)}
                      placeholder="0.000005"
                      min="0"
                      step="0.000001"
                      aria-label="Priority Fee"
                    />
                  </div>
                  <button 
                    className={`snipe-button ${status}`}
                    disabled={!tokenInfo.isValid}
                    onClick={() => status === 'ready' ? handleStartSnipe() : stopSniping()}
                    aria-label={status === 'ready' ? 'Start Sniping' : 'Stop Sniping'}
                  >
                    {status === 'ready' ? 'Start Sniping' : 'Stop Sniping'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wallets Table */}
      <div className="wallet-table">
        <div className="table-header">
          <div className="col-select">
            <label id="use-header">Use</label>
          </div>
          <div className="col-address">
            <label id="address-header">Wallet Address</label>
          </div>
          <div className="col-sol">
            <label id="sol-header">SOL</label>
          </div>
          <div className="col-usdc">
            <label id="usdc-header">USDC</label>
          </div>
          <div className="col-token">
            <label id="token-header">Token Balance</label>
          </div>
          <div className="col-status">
            <label id="status-header">Status</label>
          </div>
        </div>

        {/* Parent Wallet Row */}
        <div className="table-row parent-row">
          <div className="col-select">
            <input
              type="checkbox"
              id={`use-wallet-${publicKey}`}
              name={`use-wallet-${publicKey}`}
              checked={!excludedWallets.has(publicKey)}
              onChange={() => toggleWalletExclusion(publicKey)}
              aria-labelledby="use-header"
            />
          </div>
          <div className="col-address" aria-labelledby="address-header">
            <span className="wallet-type">Parent</span>
            {publicKey.slice(0,6)}...{publicKey.slice(-4)}
          </div>
          <div className="col-sol" aria-labelledby="sol-header">
            {parentBalance.toFixed(4)} SOL
          </div>
          <div className="col-usdc" aria-labelledby="usdc-header">
            0.00 USDC
          </div>
          <div className="col-token" aria-labelledby="token-header">
            {walletTokenBalances[publicKey]?.toFixed(4) || '0.00'}
          </div>
          <div className={`col-status status-${status}`} aria-labelledby="status-header">
            {status}
          </div>
        </div>

        {/* Subwallets Rows */}
        {subwallets.map((wallet, index) => (
          wallet && wallet.publicKey && (
            <div 
              key={wallet.publicKey.toString()}
              className={`table-row ${!excludedWallets.has(wallet.publicKey.toString()) ? 'selected' : ''}`}
            >
              <div className="col-select">
                <input
                  type="checkbox"
                  id={`use-wallet-${wallet.publicKey.toString()}`}
                  name={`use-wallet-${wallet.publicKey.toString()}`}
                  checked={!excludedWallets.has(wallet.publicKey.toString())}
                  onChange={() => toggleWalletExclusion(wallet.publicKey.toString())}
                  aria-labelledby="use-header"
                />
              </div>
              <div className="col-address" aria-labelledby="address-header">
                <span className="wallet-type">Sub {index + 1}</span>
                {wallet.publicKey.toString().slice(0,6)}...{wallet.publicKey.toString().slice(-4)}
              </div>
              <div className="col-sol" aria-labelledby="sol-header">
                {(walletBalances[wallet.publicKey.toString()] / LAMPORTS_PER_SOL || 0).toFixed(4)} SOL
              </div>
              <div className="col-usdc" aria-labelledby="usdc-header">
                0.00 USDC
              </div>
              <div className="col-token" aria-labelledby="token-header">
                {walletTokenBalances[wallet.publicKey.toString()]?.toFixed(4) || '0.00'}
              </div>
              <div className={`col-status status-${status}`} aria-labelledby="status-header">
                {status}
              </div>
            </div>
          )
        ))}
      </div>

      <SnipeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        targetCA={targetCA}
        excludedWallets={excludedWallets}
        onStartSnipe={handleSnipeConfig}
      />
    </div>
  );
}

export default SnipePage; 