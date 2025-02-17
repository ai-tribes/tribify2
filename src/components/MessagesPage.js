import React, { useState } from 'react';

const MessagesPage = ({ 
  tokenHolders, 
  publicKey, 
  messages, 
  nicknames, 
  unreadCounts,
  onSendMessage,
  onClose 
}) => {
  const [activeChat, setActiveChat] = useState(null);
  const [messageInput, setMessageInput] = useState('');

  // Get all chats with unread messages
  const unreadChats = tokenHolders.filter(holder => 
    unreadCounts[holder.address] && unreadCounts[holder.address] > 0
  );

  // Get all chats with any messages
  const allChats = tokenHolders.filter(holder =>
    messages[holder.address] && messages[holder.address].length > 0
  );

  const handleSend = (e) => {
    e.preventDefault();
    if (messageInput.trim()) {
      onSendMessage(messageInput, activeChat);
      setMessageInput('');
    }
  };

  return (
    <div className="messages-page">
      <div className="messages-header">
        <h2>Messages</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="messages-layout">
        {/* Sidebar with chats */}
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
                  <div className="chat-name">{nicknames[holder.address] || holder.address}</div>
                  <div className="unread-badge">{unreadCounts[holder.address]}</div>
                </div>
              ))}
            </div>
          )}

          {/* All Chats Section */}
          <div className="all-chats-section">
            <h3>All Messages</h3>
            {allChats.map(holder => (
              <div 
                key={holder.address}
                className={`chat-item ${activeChat === holder.address ? 'active' : ''}`}
                onClick={() => setActiveChat(holder.address)}
              >
                <div className="chat-name">{nicknames[holder.address] || holder.address}</div>
                {unreadCounts[holder.address] > 0 && (
                  <div className="unread-badge">{unreadCounts[holder.address]}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        {activeChat ? (
          <div className="chat-area">
            <div className="chat-header">
              <h3>{nicknames[activeChat] || activeChat}</h3>
            </div>
            
            <div className="messages-container">
              {messages[activeChat]?.map((msg, i) => (
                <div 
                  key={i}
                  className={`message ${msg.from === publicKey ? 'sent' : 'received'}`}
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
          </div>
        ) : (
          <div className="no-chat-selected">
            <p>Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage; 