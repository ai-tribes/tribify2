import React from 'react';

const Sign = ({ message, onSign }) => {
  const handleSign = async () => {
    try {
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await window.phantom.solana.signMessage(
        encodedMessage,
        'utf8'
      );
      onSign(signedMessage);
    } catch (error) {
      console.error('Error signing message:', error);
    }
  };

  return (
    <div className="sign-component">
      <button onClick={handleSign}>Sign Message</button>
    </div>
  );
};

export default Sign; 