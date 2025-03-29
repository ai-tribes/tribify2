import React, { useState, useEffect } from 'react';
import './SniperView.css';

function SniperView() {
  const [targets, setTargets] = useState([]);
  const [newTarget, setNewTarget] = useState({
    address: '',
    name: '',
    description: '',
    buyAmount: 0,
    maxPrice: 0,
    isActive: true
  });
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    // Load saved targets from localStorage
    const savedTargets = localStorage.getItem('sniper_targets');
    if (savedTargets) {
      setTargets(JSON.parse(savedTargets));
    }
  }, []);

  useEffect(() => {
    // Save targets to localStorage whenever they change
    localStorage.setItem('sniper_targets', JSON.stringify(targets));
  }, [targets]);

  const handleAddTarget = () => {
    if (!newTarget.address) return;
    
    if (editingIndex !== null) {
      // Update existing target
      const updatedTargets = [...targets];
      updatedTargets[editingIndex] = newTarget;
      setTargets(updatedTargets);
      setEditingIndex(null);
    } else {
      // Add new target
      setTargets([...targets, newTarget]);
    }

    // Reset form
    setNewTarget({
      address: '',
      name: '',
      description: '',
      buyAmount: 0,
      maxPrice: 0,
      isActive: true
    });
  };

  const handleEditTarget = (index) => {
    setNewTarget(targets[index]);
    setEditingIndex(index);
  };

  const handleDeleteTarget = (index) => {
    const updatedTargets = targets.filter((_, i) => i !== index);
    setTargets(updatedTargets);
  };

  const handleToggleActive = (index) => {
    const updatedTargets = [...targets];
    updatedTargets[index].isActive = !updatedTargets[index].isActive;
    setTargets(updatedTargets);
  };

  return (
    <div className="sniper-view">
      <div className="sniper-header">
        <h2>Token Sniper</h2>
        <p>Monitor and auto-buy tokens when they meet your criteria</p>
      </div>

      <div className="add-target-form">
        <h3>{editingIndex !== null ? 'Edit Target' : 'Add New Target'}</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Contract Address</label>
            <input
              type="text"
              value={newTarget.address}
              onChange={(e) => setNewTarget({ ...newTarget, address: e.target.value })}
              placeholder="Enter token contract address"
            />
          </div>

          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={newTarget.name}
              onChange={(e) => setNewTarget({ ...newTarget, name: e.target.value })}
              placeholder="Enter target name"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={newTarget.description}
              onChange={(e) => setNewTarget({ ...newTarget, description: e.target.value })}
              placeholder="Enter target description"
            />
          </div>

          <div className="form-group">
            <label>Buy Amount (SOL)</label>
            <input
              type="number"
              value={newTarget.buyAmount}
              onChange={(e) => setNewTarget({ ...newTarget, buyAmount: parseFloat(e.target.value) })}
              min="0"
              step="0.1"
            />
          </div>

          <div className="form-group">
            <label>Max Price (SOL)</label>
            <input
              type="number"
              value={newTarget.maxPrice}
              onChange={(e) => setNewTarget({ ...newTarget, maxPrice: parseFloat(e.target.value) })}
              min="0"
              step="0.1"
            />
          </div>
        </div>

        <div className="form-actions">
          <button onClick={handleAddTarget} className="add-button">
            {editingIndex !== null ? 'Update Target' : 'Add Target'}
          </button>
          {editingIndex !== null && (
            <button 
              onClick={() => {
                setEditingIndex(null);
                setNewTarget({
                  address: '',
                  name: '',
                  description: '',
                  buyAmount: 0,
                  maxPrice: 0,
                  isActive: true
                });
              }} 
              className="cancel-button"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      <div className="targets-list">
        <h3>Your Targets</h3>
        {targets.length === 0 ? (
          <div className="no-targets">
            No targets added yet. Add a target above to start monitoring.
          </div>
        ) : (
          <div className="targets-grid">
            {targets.map((target, index) => (
              <div key={index} className={`target-card ${target.isActive ? 'active' : 'inactive'}`}>
                <div className="target-header">
                  <h4>{target.name || 'Unnamed Target'}</h4>
                  <div className="target-actions">
                    <button 
                      onClick={() => handleToggleActive(index)}
                      className={`toggle-button ${target.isActive ? 'active' : ''}`}
                    >
                      {target.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <button onClick={() => handleEditTarget(index)} className="edit-button">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteTarget(index)} className="delete-button">
                      Delete
                    </button>
                  </div>
                </div>

                <div className="target-details">
                  <div className="detail-row">
                    <span className="label">Address:</span>
                    <span className="value">{target.address}</span>
                  </div>
                  {target.description && (
                    <div className="detail-row">
                      <span className="label">Description:</span>
                      <span className="value">{target.description}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">Buy Amount:</span>
                    <span className="value">{target.buyAmount} SOL</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Max Price:</span>
                    <span className="value">{target.maxPrice} SOL</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SniperView; 