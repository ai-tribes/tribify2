import React from 'react';

const ThemeToggle = ({ isDark, onToggle }) => {
  return (
    <button className="theme-toggle" onClick={onToggle}>
      {isDark ? '☀️' : '🌙'}
    </button>
  );
};

export default ThemeToggle; 