import React, { useState } from 'react';

const HamburgerMenu = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="hamburger-container">
      <button 
        className={`hamburger-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      
      <div className={`mobile-menu ${isOpen ? 'open' : ''}`}>
        {children}
      </div>
    </div>
  );
};

export default HamburgerMenu; 