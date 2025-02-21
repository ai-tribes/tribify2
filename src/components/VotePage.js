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

  const [showNewProposalModal, setShowNewProposalModal] = useState(false);
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    deadline: ''
  });

  const handleCreateProposal = (e) => {
    e.preventDefault();
    
    // Create new proposal
    createProposal({
      title: newProposal.title,
      description: newProposal.description,
      deadline: newProposal.deadline,
      proposer: publicKey
    });

    // Reset form and close modal
    setNewProposal({
      title: '',
      description: '',
      deadline: ''
    });
    setShowNewProposalModal(false);
  };

  const handleVote = (proposalId, voteType) => {
    const stakedAmount = getStakedAmount(proposalId, publicKey);
    if (stakedAmount > 0) {
      voteOnProposal(proposalId, publicKey, voteType, stakedAmount);
    }
  };

  // Separate proposals into my proposals and others
  const myProposals = motions.filter(motion => motion.proposer === publicKey);
  const otherProposals = motions.filter(motion => motion.proposer !== publicKey);

  const ProposalCard = ({ motion }) => (
    <div key={motion.id} className="motion-card">
      <div className="motion-header">
        <h3>{motion.title}</h3>
        <span className={`status-badge ${motion.status}`}>
          {motion.status}
        </span>
      </div>

      <p className="motion-description">{motion.description}</p>
      
      <div className="proposer">
        Proposed by: {motion.proposer === publicKey ? 'You' : motion.proposer.slice(0, 4) + '...' + motion.proposer.slice(-4)}
      </div>

      <div className="motion-stats">
        <div className="votes-display">
          <div className="vote-bar">
            <div 
              className="votes-for"
              style={{ 
                width: `${(motion.votesFor / (motion.votesFor + motion.votesAgainst)) * 100}%` 
              }}
            />
          </div>
          <div className="vote-counts">
            <span className="for">
              {(motion.votesFor).toLocaleString()} For
            </span>
            <span className="against">
              {(motion.votesAgainst).toLocaleString()} Against
            </span>
          </div>
        </div>
        <div className="deadline">
          Ends: {motion.deadline}
        </div>
      </div>

      <div className="motion-actions">
        {motion.proposer === publicKey ? (
          <button className="cancel-proposal">Cancel Proposal</button>
        ) : (
          <>
            <button className="vote-for" onClick={() => handleVote(motion.id, 'for')}>Vote For</button>
            <button className="vote-against" onClick={() => handleVote(motion.id, 'against')}>Vote Against</button>
          </>
        )}
      </div>
    </div>
  );

  const CreateProposalModal = ({ onClose }) => {
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      deadline: ''
    });

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    };

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3>Create New Proposal</h3>
          <button className="close-btn" onClick={onClose}>×</button>

          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter proposal title"
              className="proposal-input"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your proposal"
              className="proposal-textarea"
              rows={6}
            />
          </div>

          <div className="form-group">
            <label>Deadline</label>
            <input
              type="date"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              className="proposal-input"
            />
          </div>

          <button className="create-proposal-btn">
            Create Proposal
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="vote-page">
      <div className="vote-header">
        <h2>Governance</h2>
        <button 
          className="new-motion-button"
          onClick={() => setShowNewProposalModal(true)}
        >
          + New Proposal
        </button>
      </div>

      {showNewProposalModal && <CreateProposalModal onClose={() => setShowNewProposalModal(false)} />}

      <div className="proposals-section">
        <h3>My Proposals</h3>
        <div className="motions-list">
          {myProposals.length === 0 ? (
            <div className="no-proposals">
              You haven't created any proposals yet
            </div>
          ) : (
            myProposals.map(motion => <ProposalCard key={motion.id} motion={motion} />)
          )}
        </div>
      </div>

      <div className="proposals-section">
        <h3>Active Proposals</h3>
        <div className="motions-list">
          {otherProposals.length === 0 ? (
            <div className="no-proposals">
              No active proposals from other holders
            </div>
          ) : (
            otherProposals.map(motion => <ProposalCard key={motion.id} motion={motion} />)
          )}
        </div>
      </div>
    </div>
  );
}

export default VotePage; 