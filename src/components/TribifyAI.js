import React, { useState } from 'react';
import './TribifyAI.css';

const TribifyAI = () => {
  const [userInput, setUserInput] = useState('');
  const [aiResponses, setAiResponses] = useState([
    {
      type: 'ai',
      content: "Welcome to $Tribify.ai Assistant! I'm here to help you launch your own token and deploy your AI agent. What would you like to do today?"
    }
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!userInput.trim()) return;
    
    // Add user message to conversation
    setAiResponses(prev => [
      ...prev, 
      { type: 'user', content: userInput }
    ]);

    // Simulate AI response based on input
    setTimeout(() => {
      let response = "";
      
      if (userInput.toLowerCase().includes('launch') || userInput.toLowerCase().includes('token')) {
        response = "To launch your token, we'll need to set up a few parameters like name, symbol, total supply, and tokenomics. Would you like me to guide you through this process?";
      } else if (userInput.toLowerCase().includes('agent') || userInput.toLowerCase().includes('ai')) {
        response = "Your AI agent will help manage your community and token strategy. I can help you configure its behavior, permissions, and objectives. Ready to start setting it up?";
      } else if (userInput.toLowerCase().includes('help')) {
        response = "I can help you with: launching your token, configuring tokenomics, deploying your AI agent, setting up community governance, and managing token distribution. What would you like to explore first?";
      } else {
        response = "I'm your $Tribify assistant, ready to help with launching your token and deploying your AI agent. Would you like to start with token creation, agent configuration, or community setup?";
      }
      
      setAiResponses(prev => [
        ...prev, 
        { type: 'ai', content: response }
      ]);
    }, 1000);
    
    setUserInput('');
  };

  return (
    <div className="tribify-ai-container">
      <div className="ai-header">
        <h1>$Tribify.ai Assistant</h1>
        <p>Your AI guide to launching tokens and managing communities</p>
      </div>
      
      <div className="ai-conversation-container">
        <div className="ai-conversation">
          {aiResponses.map((message, index) => (
            <div key={index} className={`message ${message.type}`}>
              <div className="message-content">
                {message.content}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <form className="ai-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Ask about launching a token or deploying an AI agent..."
          className="ai-input"
        />
        <button type="submit" className="ai-submit">
          Send
        </button>
      </form>
    </div>
  );
};

export default TribifyAI; 