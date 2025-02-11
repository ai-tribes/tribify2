import React from 'react';

const Restore = ({ onClick }) => (
  <label className="restore-button">
    Restore
    <input 
      type="file" 
      accept=".json"
      style={{ display: 'none' }}
      onChange={onClick}
    />
  </label>
);

export default Restore; 