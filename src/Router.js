import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Import components - these will be lazy loaded in Phase 3
// For now, we'll use direct imports until we migrate all components
import SnipePage from './components/SnipePage';
import VotePage from './components/VotePage';
import MessagesPage from './components/MessagesPage';
import StakeView from './components/StakeView';
import Sign from './components/Sign';
import LandingPage from './components/LandingPage';

// Import Layout
import Layout from './common/components/Layout/Layout';

// Import new feature-based components
import WalletPage from './features/wallet';

/**
 * Router component for handling application routing
 * This will be enhanced with lazy loading in Phase 3
 */
const Router = () => {
  return (
    <Routes>
      {/* Landing page route - uses exact path */}
      <Route index element={<LandingPage />} />
      
      {/* Redirect /app to /wallet for backward compatibility */}
      <Route path="/app" element={<Navigate to="/wallet" replace />} />
      
      {/* Layout wrapper for all other routes */}
      <Route element={<Layout />}>
        {/* New feature-based routes */}
        <Route path="/wallet" element={<WalletPage />} />
        
        {/* Old component routes - these will be migrated to feature-based */}
        <Route path="/snipe" element={<SnipePage />} />
        <Route path="/vote" element={<VotePage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/stake" element={<StakeView />} />
        <Route path="/sign" element={<Sign />} />
        {/* Additional routes will be added as components are migrated */}
      </Route>
    </Routes>
  );
};

export default Router; 