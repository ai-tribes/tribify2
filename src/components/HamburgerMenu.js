import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { menuSections } from '../config/menuConfig';
import './HamburgerMenu.css';

const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
  };

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
      
      <nav className={`menu ${isOpen ? 'open' : ''}`}>
        {menuSections.map((section, index) => (
          <div key={index} className="menu-section">
            <div className="menu-section-title">{section.title}</div>
            {section.items.map((item) => (
              <button
                key={item.path}
                className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => handleNavigate(item.path)}
              >
                <span className="menu-item-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
    </div>
  );
};

export default HamburgerMenu; 