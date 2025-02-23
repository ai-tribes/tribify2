import React, { useState, useEffect, useContext } from 'react';
import './MessagesPage.css';
import { GovernanceContext } from '../context/GovernanceContext';
import { TribifyContext } from '../context/TribifyContext';
import { useNavigate } from 'react-router-dom';
import MessageModal from './MessageModal';

const MessagesPage = () => {
  const { motions = [] } = useContext(GovernanceContext);
  const { tokenHolders = [] } = useContext(TribifyContext);
  const navigate = useNavigate();
  
  const [activeChat, setActiveChat] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [messageType, setMessageType] = useState('message');
  const [messages, setMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [nicknames, setNicknames] = useState({});
  const [isOpen, setIsOpen] = useState(true);

  const parentWalletAddress = localStorage.getItem('tribify_parent_wallet');

  // Get all chats with unread messages
  const unreadChats = tokenHolders.filter(holder => 
    unreadCounts[holder.address] && unreadCounts[holder.address] > 0
  );

  // Get all chats with any messages
  const allChats = tokenHolders.filter(holder =>
    messages[holder.address] && messages[holder.address].length > 0
  );

  useEffect(() => {
    if (!parentWalletAddress) {
      navigate('/', { replace: true });
    }
  }, [navigate, parentWalletAddress]);

  const handleClose = () => {
    setIsOpen(false);
    navigate('/app/ai');
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChat) return;

    const newMessage = {
      id: Date.now(),
      text: messageInput,
      from: parentWalletAddress,
      to: activeChat,
      timestamp: Date.now(),
      delivered: true
    };

    setMessages(prev => ({
      ...prev,
      [activeChat]: [...(prev[activeChat] || []), newMessage]
    }));

    setMessageInput('');
  };

  if (!parentWalletAddress) {
    return (
      <div className="messages-page">
        <div className="no-wallet-message">
          Please connect your wallet to access messages
        </div>
      </div>
    );
  }

  const getRecipientDisplay = () => {
    if (!activeChat) return '';
    return nicknames[activeChat] || `${activeChat.slice(0, 6)}...${activeChat.slice(-4)}`;
  };

  return (
    <div className="messages-page">
      <div className="messages-modal">
        <div className="messages-header">
          <h2>Messages</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
        
        <div className="messages-layout">
          {/* Sidebar with chat list */}
          <div className="chats-sidebar">
            {unreadChats.length > 0 && (
              <div className="unread-section">
                <h3>Unread Messages</h3>
                {unreadChats.map(holder => (
                  <div
                    key={holder.address}
                    className={`chat-item ${activeChat === holder.address ? 'active' : ''}`}
                    onClick={() => setActiveChat(holder.address)}
                  >
                    <span className="chat-name">
                      {nicknames[holder.address] || `${holder.address.slice(0, 6)}...${holder.address.slice(-4)}`}
                    </span>
                    <span className="unread-badge">{unreadCounts[holder.address]}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="all-chats-section">
              <h3>All Chats</h3>
              {allChats.map(holder => (
                <div
                  key={holder.address}
                  className={`chat-item ${activeChat === holder.address ? 'active' : ''}`}
                  onClick={() => setActiveChat(holder.address)}
                >
                  <span className="chat-name">
                    {nicknames[holder.address] || `${holder.address.slice(0, 6)}...${holder.address.slice(-4)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Main chat area */}
          <div className="chat-area">
            {activeChat ? (
              <>
                <div className="chat-header">
                  <h3>{getRecipientDisplay()}</h3>
                </div>
                <div className="messages-container">
                  {messages[activeChat]?.map((msg, index) => (
                    <div
                      key={msg.id || index}
                      className={`message ${msg.from === parentWalletAddress ? 'sent' : 'received'}`}
                    >
                      <div className="message-content">{msg.text}</div>
                      <div className="message-time">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
                <form className="message-input" onSubmit={handleSend}>
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                  />
                  <button type="submit">Send</button>
                </form>
              </>
            ) : (
              <div className="no-chat-selected">
                Select a chat to start messaging
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage; 