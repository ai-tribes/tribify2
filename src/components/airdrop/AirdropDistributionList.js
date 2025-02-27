import React from 'react';
import { Checkbox, TextField } from '@mui/material';

const AirdropDistributionList = ({ recipients, setRecipients, distributionType }) => {
  const handleSelect = (address, isSelected) => {
    setRecipients(recipients.map(r => 
      r.address === address ? { ...r, selected: isSelected } : r
    ));
  };
  
  const handleAmountChange = (address, amount) => {
    setRecipients(recipients.map(r => 
      r.address === address ? { ...r, amount } : r
    ));
  };
  
  return (
    <div className="distribution-container">
      <h3>Recipient List</h3>
      <p>Select recipients and adjust amounts as needed.</p>
      
      <div className="distribution-list">
        <div className="distribution-header">
          <div>Select</div>
          <div>Address/Name</div>
          <div>Shares</div>
          <div>Amount</div>
        </div>
        
        {recipients.map((recipient) => (
          <div key={recipient.address} className="distribution-item">
            <div>
              <Checkbox 
                checked={recipient.selected} 
                onChange={(e) => handleSelect(recipient.address, e.target.checked)} 
              />
            </div>
            <div>{recipient.name || recipient.address}</div>
            <div>{recipient.shares}</div>
            <div>
              <TextField 
                type="number"
                size="small"
                value={recipient.amount}
                onChange={(e) => handleAmountChange(recipient.address, e.target.value)}
                disabled={distributionType === 'proportional' || !recipient.selected}
                variant="outlined"
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="distribution-summary">
        <p>Total recipients: {recipients.filter(r => r.selected).length}</p>
        <p>Total amount: {recipients.reduce((sum, r) => r.selected ? sum + Number(r.amount) : sum, 0)}</p>
      </div>
    </div>
  );
};

export default AirdropDistributionList; 