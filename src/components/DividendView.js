import React, { useState, useEffect } from 'react';
import { Box, Button, Container, Grid, Paper, Typography, Tabs, Tab, TextField, MenuItem, FormControl, InputLabel, Select, FormHelperText, CircularProgress, Divider, Card, CardContent } from '@mui/material';
import { useWallet } from '../contexts/WalletContext';
import { useTokens } from '../contexts/TokenContext';
import { useShareholders } from '../contexts/ShareholderContext';
import { useFinancials } from '../contexts/FinancialContext';
import { useDividendService } from '../hooks/useDividendService';
import '../styles/Dividends.css';

// Placeholder components for Dividend features
const DividendCalculator = () => <div>Dividend Calculator Component</div>;
const DividendScheduler = () => <div>Dividend Scheduler Component</div>;
const DividendHistory = ({ history }) => (
  <div className="dividend-history">
    <h3>Dividend Payment History</h3>
    {history.length === 0 ? (
      <p>No previous dividend payments found.</p>
    ) : (
      <div className="dividend-history-list">
        {history.map((dividend) => (
          <div key={dividend.id} className="history-item">
            <div>
              <strong>{dividend.name}</strong>
              <div className="dividend-date">{new Date(dividend.date).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="dividend-amount">{dividend.totalAmount.toLocaleString()} {dividend.currency}</div>
            </div>
            <div>
              <div className="dividend-recipients">{dividend.recipientCount} recipients</div>
            </div>
            <div>
              <span className={`dividend-status status-${dividend.status}`}>
                {dividend.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const DividendView = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [dividendName, setDividendName] = useState('');
  const [dividendAmount, setDividendAmount] = useState('');
  const [dividendCurrency, setDividendCurrency] = useState('');
  const [dividendType, setDividendType] = useState('proportional');
  const [calculationMethod, setCalculationMethod] = useState('percentage');
  const [percentageOfProfit, setPercentageOfProfit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  
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
  
  const financialsContext = useFinancials ? useFinancials() : {
    financialData: {
      revenue: { current: 75000, previous: 60000, ytd: 200000 },
      expenses: { current: 50000, previous: 40000, ytd: 150000 },
      profit: { current: 25000, previous: 20000, ytd: 50000 },
      cashReserves: 75000,
      historicalDividends: []
    },
    quarterlyProfit: 25000
  };
  const { financialData, quarterlyProfit } = financialsContext;
  
  const dividendService = useDividendService ? useDividendService() : {
    calculateDividend: async (data) => data,
    createDividendDistribution: async (data) => ({ id: 'sample', ...data }),
    executeDividendPayment: async () => ({ success: true }),
    scheduleDividendPayment: async () => ({ success: true }),
    getDividendHistory: async () => ([]),
    dividendHistory: [
      {
        id: 'div-2023-q2',
        date: '2023-07-15',
        name: 'Q2 2023 Dividend',
        totalAmount: 12500,
        currency: 'USDC',
        type: 'proportional',
        status: 'completed',
        recipientCount: 23
      },
      {
        id: 'div-2023-q1',
        date: '2023-04-10',
        name: 'Q1 2023 Dividend',
        totalAmount: 10000,
        currency: 'USDC',
        type: 'proportional',
        status: 'completed',
        recipientCount: 21
      }
    ]
  };
  
  const { 
    calculateDividend,
    createDividendDistribution,
    executeDividendPayment,
    scheduleDividendPayment,
    getDividendHistory,
    dividendHistory
  } = dividendService;

  useEffect(() => {
    // Calculate estimated dividend amounts when inputs change
    if (shareholders?.length > 0 && 
        (dividendAmount || calculationMethod === 'percentage')) {
      calculateDividendPreview();
    }
  }, [dividendAmount, dividendType, calculationMethod, percentageOfProfit, shareholders]);

  // Calculate a preview of the dividend distribution
  const calculateDividendPreview = () => {
    let totalShares = shareholders.reduce((total, sh) => total + sh.shares, 0);
    let totalDividendAmount = 0;
    
    if (calculationMethod === 'fixed') {
      totalDividendAmount = parseFloat(dividendAmount || 0);
    } else if (calculationMethod === 'percentage') {
      totalDividendAmount = (quarterlyProfit * percentageOfProfit) / 100;
    }
    
    let preview = [];
    
    if (dividendType === 'proportional') {
      preview = shareholders.map(sh => ({
        id: sh.id,
        address: sh.address,
        name: sh.name,
        shares: sh.shares,
        percentage: (sh.shares / totalShares) * 100,
        amount: (sh.shares / totalShares) * totalDividendAmount
      }));
    } else if (dividendType === 'equal') {
      const equalAmount = totalDividendAmount / shareholders.length;
      preview = shareholders.map(sh => ({
        id: sh.id,
        address: sh.address,
        name: sh.name,
        shares: sh.shares,
        percentage: 100 / shareholders.length,
        amount: equalAmount
      }));
    } else if (dividendType === 'tiered') {
      // Simplified tiered logic - in a real implementation, this would be more complex
      preview = shareholders.map(sh => {
        let tierMultiplier = 1;
        if (sh.shares > 100) tierMultiplier = 1.5;
        if (sh.shares > 500) tierMultiplier = 2;
        
        return {
          id: sh.id,
          address: sh.address,
          name: sh.name,
          shares: sh.shares,
          percentage: (sh.shares / totalShares) * 100,
          amount: ((sh.shares / totalShares) * totalDividendAmount) * tierMultiplier,
          tier: tierMultiplier
        };
      });
    }
    
    setPreviewData(preview);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleDividendTypeChange = (event) => {
    setDividendType(event.target.value);
  };

  const handleCalculationMethodChange = (event) => {
    setCalculationMethod(event.target.value);
  };

  const handleCreateDividend = async () => {
    if (!dividendName || (!dividendAmount && calculationMethod === 'fixed') || !dividendCurrency) return;
    
    setLoading(true);
    try {
      const totalAmount = calculationMethod === 'fixed' 
        ? parseFloat(dividendAmount) 
        : (quarterlyProfit * percentageOfProfit) / 100;
      
      const dividendData = {
        name: dividendName,
        totalAmount,
        currency: dividendCurrency,
        type: dividendType,
        calculationMethod,
        percentageOfProfit: calculationMethod === 'percentage' ? percentageOfProfit : undefined,
        distributions: previewData,
        createdBy: address,
        createdAt: new Date().toISOString(),
        recipientCount: previewData.length
      };
      
      await createDividendDistribution(dividendData);
      setSuccess(true);
      setActiveTab(3); // Move to execute tab
    } catch (error) {
      console.error("Error creating dividend distribution:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteDividend = async () => {
    setLoading(true);
    try {
      await executeDividendPayment({
        name: dividendName,
        distributions: previewData
      });
      setSuccess(true);
    } catch (error) {
      console.error("Error executing dividend payment:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total dividend amount
  const totalDividendAmount = calculationMethod === 'fixed' 
    ? parseFloat(dividendAmount || 0) 
    : (quarterlyProfit * percentageOfProfit) / 100;

  return (
    <Container maxWidth="lg" className="dividend-view">
      <Paper elevation={3} className="dividend-container">
        <Typography variant="h4" className="dividend-title">
          Dividend Distribution
          {loading && <CircularProgress size={24} className="dividend-status-indicator" />}
          {success && <span className="dividend-success-indicator">✓</span>}
        </Typography>
        
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          className="dividend-tabs"
        >
          <Tab label="Setup" />
          <Tab label="Calculate" />
          <Tab label="Schedule" />
          <Tab label="Execute" />
          <Tab label="History" />
        </Tabs>

        {/* Setup Tab */}
        {activeTab === 0 && (
          <Box className="dividend-tab-content">
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Dividend Name"
                  variant="outlined"
                  fullWidth
                  value={dividendName}
                  onChange={(e) => setDividendName(e.target.value)}
                  margin="normal"
                  placeholder="e.g., Q2 2023 Dividend"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Dividend Type</InputLabel>
                  <Select
                    value={dividendType}
                    onChange={handleDividendTypeChange}
                    label="Dividend Type"
                  >
                    <MenuItem value="proportional">Proportional to Shareholding</MenuItem>
                    <MenuItem value="equal">Equal Per Shareholder</MenuItem>
                    <MenuItem value="tiered">Tiered Based on Shareholding</MenuItem>
                  </Select>
                  <FormHelperText>How the dividend will be distributed among shareholders</FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Calculation Method</InputLabel>
                  <Select
                    value={calculationMethod}
                    onChange={handleCalculationMethodChange}
                    label="Calculation Method"
                  >
                    <MenuItem value="fixed">Fixed Amount</MenuItem>
                    <MenuItem value="percentage">Percentage of Profit</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {calculationMethod === 'fixed' ? (
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Total Dividend Amount"
                    variant="outlined"
                    fullWidth
                    type="number"
                    value={dividendAmount}
                    onChange={(e) => setDividendAmount(e.target.value)}
                    margin="normal"
                  />
                </Grid>
              ) : (
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Percentage of Profit"
                    variant="outlined"
                    fullWidth
                    type="number"
                    value={percentageOfProfit}
                    onChange={(e) => setPercentageOfProfit(Number(e.target.value))}
                    margin="normal"
                    InputProps={{
                      endAdornment: <span>%</span>,
                    }}
                  />
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Currency"
                  variant="outlined"
                  fullWidth
                  value={dividendCurrency}
                  onChange={(e) => setDividendCurrency(e.target.value)}
                  margin="normal"
                >
                  <MenuItem value="USDC">USDC</MenuItem>
                  <MenuItem value="USDT">USDT</MenuItem>
                  <MenuItem value="SOL">SOL</MenuItem>
                  {tokens.map((token) => (
                    <MenuItem key={token.address} value={token.symbol}>
                      {token.symbol}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
            
            {/* Financial Summary Card */}
            <Card className="financial-summary-card">
              <CardContent>
                <Typography variant="h6">Financial Summary</Typography>
                <Divider />
                <Grid container spacing={2} className="financial-summary-grid">
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2">Quarterly Profit</Typography>
                    <Typography variant="h6">${quarterlyProfit.toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2">Shareholder Count</Typography>
                    <Typography variant="h6">{shareholders.length}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2">Total Shares</Typography>
                    <Typography variant="h6">{shareholders.reduce((total, sh) => total + sh.shares, 0).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2">Previous Dividend</Typography>
                    <Typography variant="h6">${(dividendHistory[0]?.totalAmount || 0).toLocaleString()}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            
            <Box className="dividend-actions">
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => setActiveTab(1)}
                disabled={!dividendName || (!dividendAmount && calculationMethod === 'fixed') || !dividendCurrency}
              >
                Next: Calculate Dividends
              </Button>
            </Box>
          </Box>
        )}

        {/* Calculate Tab */}
        {activeTab === 1 && (
          <Box className="dividend-tab-content">
            <Typography variant="h6" className="dividend-section-title">
              Dividend Distribution Preview
            </Typography>
            
            <Box className="dividend-preview-container">
              <table className="dividend-preview-table">
                <thead>
                  <tr>
                    <th>Shareholder</th>
                    <th>Shares</th>
                    <th>Percentage</th>
                    <th>Dividend Amount</th>
                    {dividendType === 'tiered' && <th>Tier</th>}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name || row.address}</td>
                      <td>{row.shares.toLocaleString()}</td>
                      <td>{row.percentage.toFixed(2)}%</td>
                      <td>{row.amount.toFixed(2)} {dividendCurrency}</td>
                      {dividendType === 'tiered' && <td>{row.tier}x</td>}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>Total</td>
                    <td>100%</td>
                    <td>{totalDividendAmount.toFixed(2)} {dividendCurrency}</td>
                    {dividendType === 'tiered' && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </Box>
            
            <Box className="dividend-actions">
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
              >
                Next: Schedule Distribution
              </Button>
            </Box>
          </Box>
        )}

        {/* Schedule Tab */}
        {activeTab === 2 && (
          <Box className="dividend-tab-content">
            <DividendScheduler />
            <Box className="dividend-actions">
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
                onClick={handleCreateDividend}
                disabled={loading}
              >
                Create Dividend Distribution
              </Button>
            </Box>
          </Box>
        )}

        {/* Execute Tab */}
        {activeTab === 3 && (
          <Box className="dividend-tab-content">
            <Typography variant="h6" className="dividend-section-title">
              Execute Dividend Payment
            </Typography>
            
            <Paper className="dividend-execute-summary">
              <Typography variant="h6">Distribution Summary</Typography>
              <Divider className="dividend-divider" />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Dividend Name:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body1">{dividendName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Total Amount:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body1">
                    {totalDividendAmount.toFixed(2)} {dividendCurrency}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Recipients:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body1">{previewData.length}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Distribution Type:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body1">
                    {dividendType === 'proportional' ? 'Proportional to Shareholding' : 
                     dividendType === 'equal' ? 'Equal Per Shareholder' : 'Tiered Based on Shareholding'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
            
            <Box className="dividend-warning">
              <Typography variant="body2" color="error">
                Warning: Once executed, this dividend payment cannot be reversed. Please verify all details before proceeding.
              </Typography>
            </Box>
            
            <Box className="dividend-actions dividend-execute-actions">
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={() => setActiveTab(2)}
              >
                Back
              </Button>
              <Button 
                variant="contained" 
                color="error" 
                onClick={handleExecuteDividend}
                disabled={loading}
              >
                Execute Payment
              </Button>
            </Box>
          </Box>
        )}

        {/* History Tab */}
        {activeTab === 4 && (
          <Box className="dividend-tab-content">
            <DividendHistory history={dividendHistory} />
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default DividendView; 