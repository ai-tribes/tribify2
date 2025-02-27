import React, { useState } from 'react';
import { FormControlLabel, Radio, RadioGroup, TextField, FormControl, FormLabel, Switch, Grid } from '@mui/material';

const AirdropScheduler = () => {
  const [scheduleType, setScheduleType] = useState('immediate');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [optimizeGas, setOptimizeGas] = useState(true);
  
  return (
    <div className="schedule-container">
      <h3 className="schedule-title">Schedule Distribution</h3>
      
      <FormControl component="fieldset" className="schedule-form">
        <FormLabel component="legend">Distribution Timing</FormLabel>
        <RadioGroup 
          value={scheduleType} 
          onChange={(e) => setScheduleType(e.target.value)}
        >
          <FormControlLabel 
            value="immediate" 
            control={<Radio color="primary" />} 
            label="Execute immediately" 
          />
          <FormControlLabel 
            value="scheduled" 
            control={<Radio color="primary" />} 
            label="Schedule for later" 
          />
          <FormControlLabel 
            value="optimal" 
            control={<Radio color="primary" />} 
            label="AI-optimized timing (lowest gas fees)" 
          />
        </RadioGroup>
      </FormControl>
      
      {scheduleType === 'scheduled' && (
        <Grid container spacing={2} style={{ marginTop: '16px' }}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Time"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              variant="outlined"
            />
          </Grid>
        </Grid>
      )}
      
      <div className="schedule-option" style={{ marginTop: '24px' }}>
        <FormControlLabel
          control={
            <Switch
              checked={optimizeGas}
              onChange={(e) => setOptimizeGas(e.target.checked)}
              color="primary"
            />
          }
          label="Optimize for gas fees"
        />
        <p className="schedule-description">
          AI will monitor network conditions and execute transactions during low-fee periods
        </p>
      </div>
      
      <div className="schedule-option">
        <FormControlLabel
          control={<Switch color="primary" />}
          label="Batch transactions"
        />
        <p className="schedule-description">
          Group multiple recipients into single transactions to reduce overall gas costs
        </p>
      </div>
      
      <div className="schedule-option">
        <FormControlLabel
          control={<Switch color="primary" />}
          label="Send notification emails"
        />
        <p className="schedule-description">
          Recipients will be notified when they receive tokens
        </p>
      </div>
    </div>
  );
};

export default AirdropScheduler; 