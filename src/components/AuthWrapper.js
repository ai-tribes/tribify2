import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { TribifyContext } from '../context/TribifyContext';

const AuthWrapper = ({ children }) => {
  const { userWallets } = useContext(TribifyContext);
  
  // If no wallet is connected, redirect to landing page
  if (!userWallets || userWallets.length === 0) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AuthWrapper; 