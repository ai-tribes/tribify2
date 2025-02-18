import React, { useState, useEffect } from 'react';
import './MessagesPage.css';

const MessagesPage = ({ 
  tokenHolders, 
  publicKey, 
  messages, 
  setMessages,
  nicknames, 
  unreadCounts,
  onSendMessage,
  onClose 
}) => {
  const [activeChat, setActiveChat] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [messageType, setMessageType] = useState('message'); // 'message' or 'motion'
  const [motionDetails, setMotionDetails] = useState({
    title: '',
    description: '',
    votingPeriod: '7', // days
    options: ['For', 'Against', 'Abstain']
  });

  // Get all chats with unread messages
  const unreadChats = tokenHolders.filter(holder => 
    unreadCounts[holder.address] && unreadCounts[holder.address] > 0
  );

  // Get all chats with any messages
  const allChats = tokenHolders.filter(holder =>
    messages[holder.address] && messages[holder.address].length > 0
  );

  // Get all shareholders except self
  const otherShareholders = tokenHolders.filter(holder => 
    holder.address !== publicKey
  ).sort((a, b) => b.tokenBalance - a.tokenBalance);

  const handleSend = (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    if (messageType === 'motion') {
      // Send motion to all shareholders
      otherShareholders.forEach(holder => {
        onSendMessage({
          type: 'motion',
          title: motionDetails.title,
          description: messageInput,
          votingPeriod: motionDetails.votingPeriod,
          options: motionDetails.options
        }, holder.address);
      });
    } else {
      // Send regular message
      if (activeChat === 'all') {
        // Send to all shareholders
        otherShareholders.forEach(holder => {
          onSendMessage(messageInput, holder.address);
        });
      } else {
        // Send to single recipient
        onSendMessage(messageInput, activeChat);
      }
    }
    
    setMessageInput('');
    if (messageType === 'motion') {
      setMessageType('message');
      setMotionDetails({
        title: '',
        description: '',
        votingPeriod: '7',
        options: ['For', 'Against', 'Abstain']
      });
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target.className === 'messages-page') {
      onClose();
    }
  };

  const handleVote = (motion, option) => {
    // Update local state
    setMessages(prev => {
      const chatMessages = [...prev[motion.from]];
      const motionIndex = chatMessages.findIndex(m => m.timestamp === motion.timestamp);
      
      if (motionIndex !== -1) {
        chatMessages[motionIndex] = {
          ...chatMessages[motionIndex],
          votes: {
            ...chatMessages[motionIndex].votes,
            [publicKey]: option
          }
        };
      }

      return {
        ...prev,
        [motion.from]: chatMessages
      };
    });

    // Send vote to backend/blockchain
    console.log('Voted on motion:', {
      motionId: motion.timestamp,
      voter: publicKey,
      vote: option
    });
  };

  return (
    <div className="messages-page" onClick={handleOverlayClick}>
      <div className="messages-modal">
        <div className="messages-header">
          <h2>Messages</h2>
          <div className="message-type-selector">
            <button 
              className={`type-button ${messageType === 'single' ? 'active' : ''}`}
              onClick={() => setMessageType('single')}
            >
              Message Single Shareholder
            </button>
            <button 
              className={`type-button ${messageType === 'all' ? 'active' : ''}`}
              onClick={() => {
                setMessageType('all');
                setActiveChat('all');
              }}
            >
              Message All Shareholders
            </button>
            <button 
              className={`type-button ${messageType === 'motion' ? 'active' : ''}`}
              onClick={() => setMessageType('motion')}
            >
              Propose Motion
            </button>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="messages-layout">
          <div className="chats-sidebar">
            {/* Unread Messages Section */}
            {unreadChats.length > 0 && (
              <div className="unread-section">
                <h3>Unread Messages</h3>
                {unreadChats.map(holder => (
                  <div 
                    key={holder.address}
                    className={`chat-item ${activeChat === holder.address ? 'active' : ''}`}
                    onClick={() => setActiveChat(holder.address)}
                  >
                    <div className="chat-name">
                      {nicknames[holder.address] || holder.address.slice(0, 6)}
                    </div>
                    <div className="unread-badge">{unreadCounts[holder.address]}</div>
                  </div>
                ))}
              </div>
            )}

            {/* All Shareholders Section */}
            <div className="shareholders-section">
              <h3>All Shareholders</h3>
              <div className="shareholders-list">
                {otherShareholders.map(holder => (
                  <div 
                    key={holder.address}
                    className={`chat-item ${activeChat === holder.address ? 'active' : ''}`}
                    onClick={() => setActiveChat(holder.address)}
                  >
                    <div className="holder-info">
                      <div className="chat-name">
                        {nicknames[holder.address] || holder.address.slice(0, 6)}
                      </div>
                      <div className="holder-balance">
                        {holder.tokenBalance.toLocaleString()} $TRIBIFY
                      </div>
                    </div>
                    {unreadCounts[holder.address] > 0 && (
                      <div className="unread-badge">{unreadCounts[holder.address]}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="chat-area">
            {activeChat ? (
              <>
                <div className="chat-header">
                  <h3>
                    {activeChat === 'all' 
                      ? 'Message All Shareholders' 
                      : (nicknames[activeChat] || activeChat)
                    }
                  </h3>
                </div>
                
                <div className="messages-container">
                  {activeChat === 'all' ? (
                    <div className="broadcast-info">
                      Messages will be sent to all shareholders
                    </div>
                  ) : messages[activeChat]?.length > 0 ? (
                    messages[activeChat].map((msg, i) => (
                      <div 
                        key={i}
                        className={`message ${msg.from === publicKey ? 'sent' : 'received'}`}
                      >
                        <div className="message-content">
                          {msg.type === 'motion' ? (
                            <div className="motion-message">
                              <div className="motion-header">
                                <h4>{msg.title}</h4>
                                <span className="motion-status">{msg.status}</span>
                              </div>
                              <p className="motion-description">{msg.description}</p>
                              <div className="motion-info">
                                <span>Voting Period: {msg.votingPeriod} days</span>
                                <span>Created: {new Date(msg.timestamp).toLocaleDateString()}</span>
                              </div>
                              <div className="motion-options">
                                {msg.options.map(option => (
                                  <button 
                                    key={option}
                                    className={`vote-button ${msg.votes[publicKey] === option ? 'voted' : ''}`}
                                    onClick={() => handleVote(msg, option)}
                                    disabled={msg.status !== 'active' || msg.from === publicKey}
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            msg.text
                          )}
                        </div>
                        <div className="message-time">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-chat">
                      No messages yet. Start the conversation!
                    </div>
                  )}
                </div>

                {messageType === 'motion' ? (
                  <form className="motion-input" onSubmit={handleSend}>
                    <input
                      type="text"
                      value={motionDetails.title}
                      onChange={(e) => setMotionDetails(prev => ({
                        ...prev,
                        title: e.target.value
                      }))}
                      placeholder="Motion Title"
                    />
                    <textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Describe your motion..."
                      rows={4}
                    />
                    <div className="motion-settings">
                      <select 
                        value={motionDetails.votingPeriod}
                        onChange={(e) => setMotionDetails(prev => ({
                          ...prev,
                          votingPeriod: e.target.value
                        }))}
                      >
                        <option value="3">3 days</option>
                        <option value="7">7 days</option>
                        <option value="14">14 days</option>
                        <option value="30">30 days</option>
                      </select>
                      <button type="submit">Propose Motion</button>
                    </div>
                  </form>
                ) : (
                  <form className="message-input" onSubmit={handleSend}>
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder={`Type a message to ${activeChat === 'all' ? 'all shareholders' : (nicknames[activeChat] || 'recipient')}...`}
                    />
                    <button type="submit">Send</button>
                  </form>
                )}
              </>
            ) : (
              <div className="no-chat-selected">
                <p>Select a shareholder to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage; 