import React, { useState } from 'react';

const MessageModal = ({ 
  isOpen, 
  onClose, 
  recipient, 
  recipientName,
  messages,
  onSendMessage 
}) => {
  const [messageInput, setMessageInput] = useState('');

  if (!isOpen) return null;

  const handleSend = (e) => {
    e.preventDefault();
    if (messageInput.trim()) {
      onSendMessage(messageInput, recipient);
      setMessageInput('');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="message-modal">
        <div className="message-modal-header">
          <h3>Message to {recipientName || recipient}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="message-modal-content">
          {messages?.map((msg, i) => (
            <div 
              key={i}
              className={`message ${msg.from === recipient ? 'received' : 'sent'}`}
            >
              <div className="message-content">{msg.text}</div>
              <div className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>

        <form className="message-modal-input" onSubmit={handleSend}>
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            autoFocus
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
};

export default MessageModal; 