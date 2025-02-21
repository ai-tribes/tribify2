import React, { createContext, useState } from 'react';

// Create the context
export const GovernanceContext = createContext({
  motions: [],
  createProposal: () => {},
  voteOnProposal: () => {},
  addMessageToProposal: () => {},
  stakeForProposal: () => {},
  isProposalActive: () => false,
  getStakedAmount: () => 0,
  getUserVote: () => null
});

// Create the provider component
export const GovernanceProvider = ({ children }) => {
  const [motions, setMotions] = useState([]);
  const [stakedAmounts, setStakedAmounts] = useState({});
  const [votes, setVotes] = useState({});

  // Add a new proposal
  const createProposal = (proposal) => {
    setMotions(prev => [
      {
        ...proposal,
        id: Date.now(),
        status: 'active',
        votesFor: 0,
        votesAgainst: 0,
        stakedAmount: 0,
        messages: [],
        createdAt: new Date().toISOString()
      },
      ...prev
    ]);
  };

  // Vote on a proposal
  const voteOnProposal = (proposalId, voterAddress, voteType, amount) => {
    setMotions(prev => prev.map(motion => {
      if (motion.id === proposalId) {
        return {
          ...motion,
          votesFor: voteType === 'for' ? motion.votesFor + amount : motion.votesFor,
          votesAgainst: voteType === 'against' ? motion.votesAgainst + amount : motion.votesAgainst
        };
      }
      return motion;
    }));

    setVotes(prev => ({
      ...prev,
      [proposalId]: {
        ...prev[proposalId],
        [voterAddress]: { type: voteType, amount }
      }
    }));
  };

  // Add message to a proposal
  const addMessageToProposal = (proposalId, message) => {
    setMotions(prev => prev.map(motion => {
      if (motion.id === proposalId) {
        return {
          ...motion,
          messages: [...(motion.messages || []), message]
        };
      }
      return motion;
    }));
  };

  // Stake tokens for a proposal
  const stakeForProposal = (proposalId, walletAddress, amount) => {
    setStakedAmounts(prev => ({
      ...prev,
      [proposalId]: {
        ...prev[proposalId],
        [walletAddress]: (prev[proposalId]?.[walletAddress] || 0) + amount
      }
    }));
  };

  // Check if proposal is active
  const isProposalActive = (proposalId) => {
    const proposal = motions.find(m => m.id === proposalId);
    if (!proposal) return false;
    
    const deadline = new Date(proposal.deadline);
    return deadline > new Date() && proposal.status === 'active';
  };

  // Get user's staked amount for a proposal
  const getStakedAmount = (proposalId, walletAddress) => {
    return stakedAmounts[proposalId]?.[walletAddress] || 0;
  };

  // Get user's vote for a proposal
  const getUserVote = (proposalId, walletAddress) => {
    return votes[proposalId]?.[walletAddress];
  };

  const value = {
    motions,
    createProposal,
    voteOnProposal,
    addMessageToProposal,
    stakeForProposal,
    isProposalActive,
    getStakedAmount,
    getUserVote
  };

  return (
    <GovernanceContext.Provider value={value}>
      {children}
    </GovernanceContext.Provider>
  );
}; 