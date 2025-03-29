import React, { useState, useEffect, useContext } from 'react';
import { TribifyContext } from '../context/TribifyContext';
import './VoteProposal.css';

function VoteProposal() {
  const { publicKeys } = useContext(TribifyContext);
  const [proposals, setProposals] = useState([]);
  const [newProposal, setNewProposal] = useState({
    title: '',
    contractAddress: '',
    description: '',
    reason: '',
    expectedPrice: '',
    timeframe: ''
  });

  // Load existing proposals from localStorage
  useEffect(() => {
    const savedProposals = localStorage.getItem('target_proposals');
    if (savedProposals) {
      setProposals(JSON.parse(savedProposals));
    }
  }, []);

  // Save proposals to localStorage when updated
  useEffect(() => {
    localStorage.setItem('target_proposals', JSON.stringify(proposals));
  }, [proposals]);

  const handleSubmitProposal = () => {
    if (!newProposal.contractAddress || !newProposal.title) return;

    const proposal = {
      ...newProposal,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      votes: 0,
      voters: [],
      status: 'active',
      creator: publicKeys[0] // Use first subwallet as creator
    };

    setProposals([...proposals, proposal]);
    setNewProposal({
      title: '',
      contractAddress: '',
      description: '',
      reason: '',
      expectedPrice: '',
      timeframe: ''
    });
  };

  const handleVote = (proposalId) => {
    setProposals(proposals.map(p => {
      if (p.id === proposalId && !p.voters.includes(publicKeys[0])) {
        return {
          ...p,
          votes: p.votes + 1,
          voters: [...p.voters, publicKeys[0]]
        };
      }
      return p;
    }));
  };

  const handleApprove = (proposal) => {
    // Save approved target to sniper targets
    const target = {
      address: proposal.contractAddress,
      name: proposal.title,
      description: proposal.description,
      expectedPrice: proposal.expectedPrice,
      timeframe: proposal.timeframe,
      isActive: true,
      createdAt: new Date().toISOString(),
      votes: proposal.votes
    };

    const savedTargets = localStorage.getItem('sniper_targets') || '[]';
    const targets = JSON.parse(savedTargets);
    targets.push(target);
    localStorage.setItem('sniper_targets', JSON.stringify(targets));

    // Update proposal status
    setProposals(proposals.map(p => {
      if (p.id === proposal.id) {
        return { ...p, status: 'approved' };
      }
      return p;
    }));
  };

  return (
    <div className="vote-proposal-container">
      <div className="proposal-form">
        <h2>Propose New Target</h2>
        <p className="form-description">
          Suggest a token for the TRIBIFY tribe to target. Approved targets will be available for coordinated buying/selling.
        </p>

        <div className="form-group">
          <label>Target Name</label>
          <input
            type="text"
            value={newProposal.title}
            onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
            placeholder="Enter token name"
          />
        </div>

        <div className="form-group">
          <label>Contract Address</label>
          <input
            type="text"
            value={newProposal.contractAddress}
            onChange={(e) => setNewProposal({ ...newProposal, contractAddress: e.target.value })}
            placeholder="Enter token contract address"
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={newProposal.description}
            onChange={(e) => setNewProposal({ ...newProposal, description: e.target.value })}
            placeholder="Describe the token and why it's a good target"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Expected Price Impact</label>
            <input
              type="text"
              value={newProposal.expectedPrice}
              onChange={(e) => setNewProposal({ ...newProposal, expectedPrice: e.target.value })}
              placeholder="e.g. +200%"
            />
          </div>

          <div className="form-group">
            <label>Timeframe</label>
            <input
              type="text"
              value={newProposal.timeframe}
              onChange={(e) => setNewProposal({ ...newProposal, timeframe: e.target.value })}
              placeholder="e.g. 24-48 hours"
            />
          </div>
        </div>

        <button className="submit-proposal" onClick={handleSubmitProposal}>
          Submit Proposal
        </button>
      </div>

      <div className="proposals-list">
        <h2>Active Proposals</h2>
        
        {proposals.filter(p => p.status === 'active').map(proposal => (
          <div key={proposal.id} className="proposal-card">
            <div className="proposal-header">
              <h3>{proposal.title}</h3>
              <div className="vote-count">
                <span className="votes">{proposal.votes}</span>
                <span className="label">votes</span>
              </div>
            </div>

            <div className="contract-address">
              <span className="label">Contract:</span>
              <span className="value">{proposal.contractAddress}</span>
            </div>

            <p className="description">{proposal.description}</p>

            <div className="proposal-metrics">
              <div className="metric">
                <span className="label">Expected Impact:</span>
                <span className="value">{proposal.expectedPrice}</span>
              </div>
              <div className="metric">
                <span className="label">Timeframe:</span>
                <span className="value">{proposal.timeframe}</span>
              </div>
            </div>

            <div className="proposal-footer">
              <button 
                className="vote-button"
                onClick={() => handleVote(proposal.id)}
                disabled={proposal.voters.includes(publicKeys[0])}
              >
                {proposal.voters.includes(publicKeys[0]) ? 'Voted' : 'Vote'}
              </button>

              {proposal.votes >= 100 && ( // Example threshold
                <button 
                  className="approve-button"
                  onClick={() => handleApprove(proposal)}
                >
                  Approve Target
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="approved-targets">
        <h2>Approved Targets</h2>
        {proposals.filter(p => p.status === 'approved').map(proposal => (
          <div key={proposal.id} className="target-card approved">
            <div className="target-header">
              <h3>{proposal.title}</h3>
              <span className="status">Approved</span>
            </div>
            <div className="contract-address">
              <span className="label">Contract:</span>
              <span className="value">{proposal.contractAddress}</span>
            </div>
            <div className="target-metrics">
              <div className="metric">
                <span className="label">Final Votes:</span>
                <span className="value">{proposal.votes}</span>
              </div>
              <div className="metric">
                <span className="label">Expected Impact:</span>
                <span className="value">{proposal.expectedPrice}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default VoteProposal; 