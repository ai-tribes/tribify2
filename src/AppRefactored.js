import React from 'react';
import './App.css';
import { BrowserRouter } from 'react-router-dom';
import Router from './Router';
import { TribifyProvider } from './context/TribifyContext';
import { GovernanceProvider } from './context/GovernanceContext';
import { AuthProvider } from './context/AuthContext';

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
const App = () => {
  // The main App component is now primarily responsible for
  // setting up context providers and rendering the Router
  
  return (
    <BrowserRouter>
      <AuthProvider>
        <TribifyProvider>
          <GovernanceProvider>
            {/* Additional context providers can be added here as needed */}
            <div className="App">
              {/* Status message would be handled by the AuthContext */}
              <Router />
            </div>
          </GovernanceProvider>
        </TribifyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App; 