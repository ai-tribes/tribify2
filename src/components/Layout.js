import React from 'react';
import Sidebar from './Sidebar';
import HamburgerMenu from './HamburgerMenu';
import './Layout.css';

const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      {/* Desktop Menu */}
      <Sidebar />
      
      {/* Mobile Menu */}
      <HamburgerMenu />
      
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};

export default Layout; 