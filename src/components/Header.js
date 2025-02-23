import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

function Header({ title }) {
  const navigate = useNavigate();
  
  return (
    <div className="page-header">
      <div className="header-left">
        <h1>{title}</h1>
      </div>
      <div className="header-actions">
        <button className="close-button" onClick={() => navigate('/app')}>×</button>
      </div>
    </div>
  );
}

export default Header; 