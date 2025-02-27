import React, { useState } from 'react';
import { FormControlLabel, Switch, TextField, Select, MenuItem, FormControl, InputLabel, Grid } from '@mui/material';

const AirdropRules = ({ isAdvancedMode }) => {
  const [vestingEnabled, setVestingEnabled] = useState(false);
  const [kycRequired, setKycRequired] = useState(false);
  const [vestingPeriod, setVestingPeriod] = useState('30');
  const [vestingType, setVestingType] = useState('linear');
  
  return (
    <div className="rules-container">
      <h3 className="rules-title">Distribution Rules</h3>
      
      {/* Basic Rules */}
      <div className="rule-item">
        <FormControlLabel
          control={
            <Switch
              checked={kycRequired}
              onChange={(e) => setKycRequired(e.target.checked)}
              color="primary"
            />
          }
          label="Require KYC verification"
        />
        <p className="rule-description">Only verified addresses will receive tokens</p>
      </div>
      
      {/* Vesting Rules */}
      <div className="rule-item">
        <FormControlLabel
          control={
            <Switch
              checked={vestingEnabled}
              onChange={(e) => setVestingEnabled(e.target.checked)}
              color="primary"
            />
          }
          label="Enable vesting schedule"
        />
        
        {vestingEnabled && (
          <Grid container spacing={2} style={{ marginTop: '10px' }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Vesting Period (days)"
                variant="outlined"
                fullWidth
                type="number"
                value={vestingPeriod}
                onChange={(e) => setVestingPeriod(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Vesting Type</InputLabel>
                <Select
                  value={vestingType}
                  onChange={(e) => setVestingType(e.target.value)}
                  label="Vesting Type"
                >
                  <MenuItem value="linear">Linear</MenuItem>
                  <MenuItem value="cliff">Cliff</MenuItem>
                  <MenuItem value="staged">Staged</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        )}
      </div>
      
      {/* Advanced Rules for Advanced Mode */}
      {isAdvancedMode && (
        <>
          <div className="rule-item">
            <FormControlLabel
              control={<Switch color="primary" />}
              label="Enable transfer restrictions"
            />
            <p className="rule-description">Recipients cannot transfer tokens until vesting is complete</p>
          </div>
          
          <div className="rule-item">
            <FormControlLabel
              control={<Switch color="primary" />}
              label="Enable regional compliance"
            />
            <p className="rule-description">Apply region-specific distribution rules</p>
          </div>
        </>
      )}
    </div>
  );
};

export default AirdropRules; 