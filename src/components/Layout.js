import React from 'react';
import Sidebar from './Sidebar';
import HamburgerMenu from './HamburgerMenu';
import WalletButton from './WalletButton';
import './Layout.css';

const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <div className="app-header">
        <WalletButton />
        {/* Desktop Menu */}
        <Sidebar />
        
        {/* Mobile Menu */}
        <HamburgerMenu />
      </div>
      
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};

export default Layout; 