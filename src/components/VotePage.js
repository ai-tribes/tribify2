import React, { useState, useContext } from 'react';
import './VotePage.css';
import { GovernanceContext } from '../context/GovernanceContext';

function VotePage({ tokenHolders, publicKey }) {
  const { 
    motions, 
    createProposal, 
    voteOnProposal,
    getStakedAmount,
    getUserVote 
  } = useContext(GovernanceContext);

  const [showNewTargetModal, setShowNewTargetModal] = useState(false);
  const [newTarget, setNewTarget] = useState({
    name: '',
    tokenCA: '',
    description: '',
    votingPeriod: '7',
    minStake: '1000' // Minimum TRIBIFY tokens to stake for voting
  });

  const handleCreateTarget = (e) => {
    e.preventDefault();
    
    // Create new target proposal
    createProposal({
      type: 'target',
      name: newTarget.name,
      tokenCA: newTarget.tokenCA,
      description: newTarget.description,
      votingPeriod: newTarget.votingPeriod,
      minStake: newTarget.minStake,
      proposer: publicKey,
      totalStaked: 0,
      votes: {}
    });

    // Reset form and close modal
    setNewTarget({
      name: '',
      tokenCA: '',
      description: '',
      votingPeriod: '7',
      minStake: '1000'
    });
    setShowNewTargetModal(false);
  };

  const handleStakeVote = (targetId, amount) => {
    if (amount > 0) {
      voteOnProposal(targetId, publicKey, 'stake', amount);
    }
  };

  // Separate targets into active and completed
  const activeTargets = motions.filter(motion => motion.status === 'active');
  const completedTargets = motions.filter(motion => motion.status === 'completed');

  const TargetCard = ({ target }) => {
    const [stakeAmount, setStakeAmount] = useState('');
    const userStake = target.votes[publicKey] || 0;
    const totalStaked = Object.values(target.votes).reduce((a, b) => a + b, 0);
    
    return (
      <div className="target-card">
        <div className="target-header">
          <h3>{target.name}</h3>
          <span className={`status-badge ${target.status}`}>
            {target.status}
          </span>
        </div>

        <div className="target-ca">
          Token CA: {target.tokenCA}
        </div>

        <p className="target-description">{target.description}</p>
        
        <div className="proposer">
          Proposed by: {target.proposer === publicKey ? 'You' : 
            (tokenHolders.find(h => h.address === target.proposer)?.username || 
            target.proposer.slice(0, 4) + '...' + target.proposer.slice(-4))}
        </div>

        <div className="target-stats">
          <div className="stake-display">
            <div className="stake-bar">
              <div 
                className="total-staked"
                style={{ width: `${(totalStaked / target.minStake) * 100}%` }}
              />
            </div>
            <div className="stake-info">
              <span className="total">
                {totalStaked.toLocaleString()} TRIBIFY Staked
              </span>
              <span className="user-stake">
                Your Stake: {userStake.toLocaleString()} TRIBIFY
              </span>
            </div>
          </div>
          <div className="deadline">
            Voting Ends: {new Date(target.endTime).toLocaleDateString()}
          </div>
        </div>

        {target.status === 'active' && (
          <div className="target-actions">
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="Enter TRIBIFY amount to stake"
              className="stake-input"
            />
            <button 
              className="stake-button"
              onClick={() => handleStakeVote(target.id, parseFloat(stakeAmount))}
              disabled={!stakeAmount || parseFloat(stakeAmount) <= 0}
            >
              Stake TRIBIFY
            </button>
          </div>
        )}
      </div>
    );
  };

  const CreateTargetModal = ({ onClose }) => {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3>Propose New Target</h3>
          <button className="close-btn" onClick={onClose}>×</button>

          <div className="form-group">
            <label>Target Name</label>
            <input
              type="text"
              value={newTarget.name}
              onChange={(e) => setNewTarget(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter target name"
              className="target-input"
            />
          </div>

          <div className="form-group">
            <label>Token Contract Address (CA)</label>
            <input
              type="text"
              value={newTarget.tokenCA}
              onChange={(e) => setNewTarget(prev => ({ ...prev, tokenCA: e.target.value }))}
              placeholder="Enter token CA"
              className="target-input"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={newTarget.description}
              onChange={(e) => setNewTarget(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Why should we target this token?"
              className="target-textarea"
              rows={6}
            />
          </div>

          <div className="form-group">
            <label>Voting Period (Days)</label>
            <select
              value={newTarget.votingPeriod}
              onChange={(e) => setNewTarget(prev => ({ ...prev, votingPeriod: e.target.value }))}
              className="target-select"
            >
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </select>
          </div>

          <div className="form-group">
            <label>Minimum Stake Required (TRIBIFY)</label>
            <input
              type="number"
              value={newTarget.minStake}
              onChange={(e) => setNewTarget(prev => ({ ...prev, minStake: e.target.value }))}
              className="target-input"
              min="1000"
              step="1000"
            />
          </div>

          <button 
            className="create-target-btn"
            onClick={handleCreateTarget}
          >
            Propose Target
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="vote-page">
      <div className="vote-header">
        <h2>Target Proposals</h2>
        <button 
          className="new-target-button"
          onClick={() => setShowNewTargetModal(true)}
        >
          + Propose New Target
        </button>
      </div>

      {showNewTargetModal && <CreateTargetModal onClose={() => setShowNewTargetModal(false)} />}

      <div className="targets-section">
        <h3>Active Targets</h3>
        <div className="targets-list">
          {activeTargets.length === 0 ? (
            <div className="no-targets">
              No active target proposals
            </div>
          ) : (
            activeTargets.map(target => <TargetCard key={target.id} target={target} />)
          )}
        </div>
      </div>

      <div className="targets-section">
        <h3>Completed Raids</h3>
        <div className="targets-list">
          {completedTargets.length === 0 ? (
            <div className="no-targets">
              No completed raids yet
            </div>
          ) : (
            completedTargets.map(target => <TargetCard key={target.id} target={target} />)
          )}
        </div>
      </div>
    </div>
  );
}

export default VotePage; 