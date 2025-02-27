import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useTokens } from '../contexts/TokenContext';
import { useShareholders } from '../contexts/ShareholderContext';
import { Box, Button, Container, Grid, Paper, Typography, Tabs, Tab, TextField, MenuItem, Switch, FormControlLabel } from '@mui/material';
import AirdropDistributionList from './airdrop/AirdropDistributionList';
import AirdropRules from './airdrop/AirdropRules';
import AirdropScheduler from './airdrop/AirdropScheduler';
import AirdropExecute from './airdrop/AirdropExecute';
import { useAirdropService } from '../hooks/useAirdropService';
import '../styles/Airdrop.css';

// Simple placeholder for AirdropStatusIndicator
const AirdropStatusIndicator = ({ status }) => {
  return (
    <span className={`airdrop-status ${status}`}>
      {status === 'loading' && '⏳'}
      {status === 'success' && '✓'}
      {status === 'error' && '✗'}
    </span>
  );
};

// Simple placeholder for AirdropHistory - renamed to avoid conflict
const AirdropHistoryView = ({ history }) => {
  return (
    <div className="airdrop-history">
      <h3>Airdrop History</h3>
      {history.length === 0 ? (
        <p>No previous airdrops found.</p>
      ) : (
        history.map((airdrop) => (
          <div key={airdrop.id} className="history-item">
            <div>
              <strong>{airdrop.name}</strong>
              <div className="airdrop-date">{new Date(airdrop.date).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="airdrop-token">{airdrop.tokenSymbol}</div>
              <div className="airdrop-amount">{airdrop.totalAmount.toLocaleString()}</div>
            </div>
            <div>
              <div className="airdrop-recipients">{airdrop.recipients} recipients</div>
            </div>
            <div>
              <span className={`history-status status-${airdrop.status}`}>
                {airdrop.status}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const AirdropView = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [airdropName, setAirdropName] = useState('');
  const [selectedToken, setSelectedToken] = useState('');
  const [description, setDescription] = useState('');
  const [distributionType, setDistributionType] = useState('proportional');
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  
  // Try to get context data with fallbacks for testing
  const wallet = useWallet ? useWallet() : { connected: true, address: 'SAMPLE_ADDRESS' };
  const { connected, address } = wallet;
  
  const tokensContext = useTokens ? useTokens() : { 
    tokens: [
      { address: '672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump', symbol: 'TRIB', name: 'TRIBIFY' },
      { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', name: 'USD Coin' }
    ] 
  };
  const { tokens } = tokensContext;
  
  const shareholdersContext = useShareholders ? useShareholders() : { 
    shareholders: [
      { id: '1', address: 'Aycm5thyEQXMFR6CNVKL5f6SRJ3KVTCGA3HYoRTHN2kN', name: 'Shareholder 1', shares: 1000 },
      { id: '2', address: 'DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv', name: 'Treasury', shares: 500000 }
    ]
  };
  const { shareholders } = shareholdersContext;
  
  const airdropService = useAirdropService ? useAirdropService() : {
    createAirdrop: async () => ({ id: 'sample' }),
    updateAirdrop: async () => ({}),
    executeAirdrop: async () => ({ success: true }),
    scheduleAirdrop: async () => ({ success: true }),
    getAirdropHistory: async () => ([]),
    airdropHistory: []
  };
  
  const { 
    createAirdrop, 
    updateAirdrop, 
    executeAirdrop,
    scheduleAirdrop,
    getAirdropHistory,
    airdropHistory
  } = airdropService;

  useEffect(() => {
    // Initial load of shareholder data
    if (connected && shareholders && shareholders.length > 0) {
      setRecipients(shareholders.map(sh => ({
        address: sh.address,
        name: sh.name,
        shares: sh.shares,
        amount: calculateProportionalAmount(sh.shares),
        selected: true
      })));
    }
  }, [connected, shareholders]);

  const calculateProportionalAmount = (shares) => {
    // Sample calculation - would be more complex in real implementation
    const totalShares = shareholders?.reduce((sum, sh) => sum + sh.shares, 0) || 100;
    return (shares / totalShares) * 1000; // Distribute 1000 tokens proportionally
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleTokenSelect = (event) => {
    setSelectedToken(event.target.value);
  };

  const handleDistributionTypeChange = (event) => {
    setDistributionType(event.target.value);
    
    // Recalculate distributions based on type
    if (event.target.value === 'proportional') {
      setRecipients(recipients.map(r => ({
        ...r,
        amount: calculateProportionalAmount(shareholders.find(s => s.address === r.address)?.shares || 0)
      })));
    } else if (event.target.value === 'equal') {
      const selectedCount = recipients.filter(r => r.selected).length;
      if (selectedCount > 0) {
        const equalAmount = 1000 / selectedCount; // 1000 tokens equally distributed
        setRecipients(recipients.map(r => ({
          ...r,
          amount: r.selected ? equalAmount : 0
        })));
      }
    }
  };

  const handleCreateAirdrop = async () => {
    if (!airdropName || !selectedToken) return;
    
    setLoading(true);
    try {
      const airdropData = {
        name: airdropName,
        description,
        token: selectedToken,
        tokenSymbol: tokens.find(t => t.address === selectedToken)?.symbol || 'TOKEN',
        distributionType,
        recipients: recipients.filter(r => r.selected).length,
        totalAmount: recipients.reduce((sum, r) => r.selected ? sum + Number(r.amount) : sum, 0),
        createdBy: address,
        createdAt: new Date().toISOString()
      };
      
      await createAirdrop(airdropData);
      setSuccess(true);
      setActiveTab(4); // Move to execute tab
    } catch (error) {
      console.error("Error creating airdrop:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAirdrop = async () => {
    setLoading(true);
    try {
      await executeAirdrop({
        name: airdropName,
        token: tokens.find(t => t.address === selectedToken),
        recipients: recipients.filter(r => r.selected)
      });
      setSuccess(true);
    } catch (error) {
      console.error("Error executing airdrop:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" className="airdrop-view">
      <Paper elevation={3} className="airdrop-container">
        <Typography variant="h4" className="airdrop-title">
          Airdrop Management
          {loading && <AirdropStatusIndicator status="loading" />}
          {success && <AirdropStatusIndicator status="success" />}
        </Typography>
        
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          className="airdrop-tabs"
        >
          <Tab label="Setup" />
          <Tab label="Recipients" />
          <Tab label="Rules" />
          <Tab label="Schedule" />
          <Tab label="Execute" />
          <Tab label="History" />
        </Tabs>

        {/* Setup Tab */}
        {activeTab === 0 && (
          <Box className="airdrop-tab-content">
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Airdrop Name"
                  variant="outlined"
                  fullWidth
                  value={airdropName}
                  onChange={(e) => setAirdropName(e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Token to Airdrop"
                  variant="outlined"
                  fullWidth
                  value={selectedToken}
                  onChange={handleTokenSelect}
                  margin="normal"
                >
                  {tokens.map((token) => (
                    <MenuItem key={token.address} value={token.address}>
                      {token.symbol} - {token.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  label="Distribution Type"
                  variant="outlined"
                  fullWidth
                  value={distributionType}
                  onChange={handleDistributionTypeChange}
                  margin="normal"
                >
                  <MenuItem value="proportional">Proportional to Shareholding</MenuItem>
                  <MenuItem value="equal">Equal Distribution</MenuItem>
                  <MenuItem value="tiered">Tiered Distribution</MenuItem>
                  <MenuItem value="custom">Custom Distribution</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isAdvancedMode}
                      onChange={(e) => setIsAdvancedMode(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Advanced Mode"
                />
              </Grid>
            </Grid>
            <Box className="airdrop-actions">
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => setActiveTab(1)}
                disabled={!airdropName || !selectedToken}
              >
                Next: Select Recipients
              </Button>
            </Box>
          </Box>
        )}

        {/* Recipients Tab */}
        {activeTab === 1 && (
          <Box className="airdrop-tab-content">
            <AirdropDistributionList 
              recipients={recipients}
              setRecipients={setRecipients}
              distributionType={distributionType}
            />
            <Box className="airdrop-actions">
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={() => setActiveTab(0)}
              >
                Back
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => setActiveTab(2)}
                disabled={recipients.filter(r => r.selected).length === 0}
              >
                Next: Set Rules
              </Button>
            </Box>
          </Box>
        )}

        {/* Rules Tab */}
        {activeTab === 2 && (
          <Box className="airdrop-tab-content">
            <AirdropRules 
              isAdvancedMode={isAdvancedMode}
            />
            <Box className="airdrop-actions">
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={() => setActiveTab(1)}
              >
                Back
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => setActiveTab(3)}
              >
                Next: Schedule
              </Button>
            </Box>
          </Box>
        )}

        {/* Schedule Tab */}
        {activeTab === 3 && (
          <Box className="airdrop-tab-content">
            <AirdropScheduler />
            <Box className="airdrop-actions">
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={() => setActiveTab(2)}
              >
                Back
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleCreateAirdrop}
                disabled={loading}
              >
                Create Airdrop
              </Button>
            </Box>
          </Box>
        )}

        {/* Execute Tab */}
        {activeTab === 4 && (
          <Box className="airdrop-tab-content">
            <AirdropExecute 
              airdropName={airdropName}
              token={tokens.find(t => t.address === selectedToken)}
              recipients={recipients.filter(r => r.selected)}
              onExecute={handleExecuteAirdrop}
              loading={loading}
            />
          </Box>
        )}

        {/* History Tab */}
        {activeTab === 5 && (
          <Box className="airdrop-tab-content">
            <AirdropHistoryView history={airdropHistory} />
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default AirdropView; 