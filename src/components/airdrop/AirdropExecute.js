import React from 'react';
import { Button, Typography, Box, Paper, Divider, Grid, CircularProgress } from '@mui/material';

const AirdropExecute = ({ airdropName, token, recipients, onExecute, loading }) => {
  const totalRecipients = recipients.length;
  const totalAmount = recipients.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  
  return (
    <div className="execute-container">
      <Typography variant="h6" className="execute-title">
        Execute Airdrop
      </Typography>
      
      <Paper className="execution-summary">
        <Typography variant="h6">Airdrop Summary</Typography>
        <Divider className="execution-divider" style={{ margin: '16px 0' }} />
        
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Airdrop Name:</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body1">{airdropName}</Typography>
          </Grid>
          
          <Grid item xs={6}>
            <Typography variant="subtitle2">Token:</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body1">
              {token ? `${token.symbol} (${token.name})` : 'Not selected'}
            </Typography>
          </Grid>
          
          <Grid item xs={6}>
            <Typography variant="subtitle2">Recipients:</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body1">{totalRecipients}</Typography>
          </Grid>
          
          <Grid item xs={6}>
            <Typography variant="subtitle2">Total Amount:</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body1">
              {totalAmount} {token?.symbol || ''}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      
      <Box className="execution-warning">
        <Typography variant="body2" color="error">
          Warning: Once executed, this airdrop cannot be reversed. Please verify all details before proceeding.
        </Typography>
      </Box>
      
      <Box className="additional-info" sx={{ mt: 3, p: 2, bgcolor: '#1e293b', borderRadius: 1 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Transaction Information:</Typography>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          • Estimated gas fee: ~0.005 SOL
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          • Network: Solana Mainnet
        </Typography>
        <Typography variant="body2">
          • Transaction type: Token Transfer (SPL)
        </Typography>
      </Box>
      
      <Box display="flex" justifyContent="flex-end" mt={4}>
        <Button 
          variant="contained" 
          color="error" 
          onClick={onExecute}
          disabled={loading || totalRecipients === 0}
          startIcon={loading && <CircularProgress size={20} color="inherit" />}
        >
          {loading ? 'Processing...' : 'Execute Airdrop'}
        </Button>
      </Box>
    </div>
  );
};

export default AirdropExecute; 