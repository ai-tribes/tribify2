import React from 'react';

const ThemeToggle = ({ isDark, onToggle }) => {
  return (
    <button 
      onClick={onToggle} 
      className="theme-toggle"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
};

export default ThemeToggle; 