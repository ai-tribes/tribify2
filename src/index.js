import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.js';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { TribifyProvider } from './context/TribifyContext';
import WalletPage from './components/WalletPage';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <TribifyProvider>
      <Router>
        <Routes>
          <Route exact path="/" element={<App />} />
          <Route path="/wallet" element={<WalletPage />} />
        </Routes>
      </Router>
    </TribifyProvider>
  </React.StrictMode>
);
