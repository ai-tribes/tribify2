import React, { useEffect } from 'react';
import './App.css';
import { BrowserRouter } from 'react-router-dom';
import Router from './Router';
import { TribifyProvider } from './context/TribifyContext';
import { GovernanceProvider } from './context/GovernanceContext';

/**
 * Main App component for the Tribify platform
 * 
 * This refactored version:
 * 1. Separates routing into the Router component
 * 2. Wraps the app in necessary context providers
 * 3. Removes direct component rendering from App.js
 * 4. Follows a cleaner, more maintainable architecture
 * 
 * @returns {JSX.Element} The main App component
 */
function App() {
  // Initialize theme on app load
  useEffect(() => {
    const savedTheme = localStorage.getItem('tribify_theme') || 'dark';
    document.body.classList.add(savedTheme);
  }, []);
  
  return (
    <BrowserRouter>
      <TribifyProvider>
        <GovernanceProvider>
          {/* Additional context providers can be added here as needed */}
          <div className="App">
            <Router />
          </div>
        </GovernanceProvider>
      </TribifyProvider>
    </BrowserRouter>
  );
}

export default App; 