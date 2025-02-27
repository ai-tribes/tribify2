import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { TribifyProvider } from './context/TribifyContext';
import { GovernanceProvider } from './context/GovernanceContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <TribifyProvider>
      <GovernanceProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </GovernanceProvider>
    </TribifyProvider>
  </React.StrictMode>
);
