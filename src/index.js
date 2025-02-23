import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.js';
import LandingPage from './components/LandingPage';
import { BrowserRouter as Router } from 'react-router-dom';
import { TribifyProvider } from './context/TribifyContext';
import { GovernanceProvider } from './context/GovernanceContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <TribifyProvider>
      <GovernanceProvider>
        <Router>
          <App />
        </Router>
      </GovernanceProvider>
    </TribifyProvider>
  </React.StrictMode>
);
