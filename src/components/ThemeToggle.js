import React, { useEffect } from 'react';
import './ThemeToggle.css';

const ThemeToggle = ({ isDark, onToggle }) => {
  // Initialize theme from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('tribify_theme') || 'dark';
    document.body.classList.add(savedTheme);
  }, []);

  return (
    <button className="theme-toggle" onClick={onToggle} aria-label="Toggle theme">
      <div className={`toggle-track ${isDark ? 'dark' : 'light'}`}>
        <div className="toggle-thumb"></div>
        <span className="toggle-icon">
          {isDark ? '🌙' : '☀️'}
        </span>
      </div>
    </button>
  );
};

export default ThemeToggle; 