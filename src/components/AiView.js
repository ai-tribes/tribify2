import React, { useState } from 'react';
import './AiView.css';

const AiView = () => {
  const [messages, setMessages] = useState([
    // Add welcome message
    {
      role: 'assistant',
      content: 'Hello! I\'m Tribify AI. How can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      setMessages(prev => [...prev, { role: 'assistant', content: '...', loading: true }]);

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });

      const data = await response.json();

      setMessages(prev => [
        ...prev.filter(msg => !msg.loading),
        { role: 'assistant', content: data.message }
      ]);
    } catch (error) {
      console.error('AI chat error:', error);
      setMessages(prev => [
        ...prev.filter(msg => !msg.loading),
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-view">
      <div className="ai-header">
        <div className="ai-status">
          <div className="status-indicator"></div>
          <span>Tribify AI Assistant</span>
        </div>
      </div>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`message ${message.role} ${message.loading ? 'loading' : ''}`}
            >
              <div className="message-avatar">
                {message.role === 'assistant' ? '🤖' : '👤'}
              </div>
              <div className="message-content">
                {message.loading ? (
                  <div className="loading-dots">
                    <span>.</span><span>.</span><span>.</span>
                  </div>
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}
        </div>
        
        <form className="chat-input" onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about Tribify..."
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <div className="button-loading">
                <span>.</span><span>.</span><span>.</span>
              </div>
            ) : (
              'Send'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AiView; 