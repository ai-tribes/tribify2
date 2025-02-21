import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.js';
import LandingPage from './components/LandingPage';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { TribifyProvider } from './context/TribifyContext';
import WalletPage from './components/WalletPage';
import { GovernanceProvider } from './context/GovernanceContext';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  if (!window.phantom?.solana?.isConnected || !localStorage.getItem('tribify_parent_wallet')) {
    return <Navigate to="/" />;
  }
  return children;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <TribifyProvider>
      <GovernanceProvider>
        <Router>
          <Routes>
            {/* Landing page is the default route */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Protected routes */}
            <Route path="/app" element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            } />
            <Route path="/wallet" element={
              <ProtectedRoute>
                <WalletPage />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </GovernanceProvider>
    </TribifyProvider>
  </React.StrictMode>
);
