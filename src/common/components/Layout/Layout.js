import React, { useContext } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import ThemeToggle from '../../../components/ThemeToggle';
import './Layout.css';

/**
 * Layout component that provides consistent structure for all pages
 * Uses React Router's Outlet component to render child routes
 * 
 * @returns {JSX.Element} Layout component
 */
const Layout = () => {
  const location = useLocation();
  
  // Check if the current route is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Get parent wallet from localStorage
  const isConnected = localStorage.getItem('tribify_parent_wallet') !== null;
  const parentWallet = localStorage.getItem('tribify_parent_wallet') || '';
  
  // Simplified wallet display
  const displayWallet = parentWallet ? 
    `${parentWallet.substring(0, 4)}...${parentWallet.substring(parentWallet.length - 4)}` : 
    'Not Connected';

  // Theme toggle function
  const toggleTheme = () => {
    const isDark = document.body.classList.contains('dark');
    if (isDark) {
      document.body.classList.remove('dark');
      document.body.classList.add('light');
      localStorage.setItem('tribify_theme', 'light');
    } else {
      document.body.classList.remove('light');
      document.body.classList.add('dark');
      localStorage.setItem('tribify_theme', 'dark');
    }
  };

  // Get current theme
  const isDark = document.body.classList.contains('dark');

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="layout-header-content">
          <div className="layout-logo">
            <Link to="/">Tribify</Link>
          </div>
          <nav className="layout-nav">
            <ul>
              <li>
                <Link 
                  to="/wallet" 
                  className={isActive('/wallet') ? 'active' : ''}
                >
                  Wallet
                </Link>
              </li>
              <li>
                <Link 
                  to="/snipe" 
                  className={isActive('/snipe') ? 'active' : ''}
                >
                  Sniper
                </Link>
              </li>
              <li>
                <Link 
                  to="/stake" 
                  className={isActive('/stake') ? 'active' : ''}
                >
                  Staking
                </Link>
              </li>
              <li>
                <Link 
                  to="/vote" 
                  className={isActive('/vote') ? 'active' : ''}
                >
                  Governance
                </Link>
              </li>
              <li>
                <Link 
                  to="/messages" 
                  className={isActive('/messages') ? 'active' : ''}
                >
                  Messages
                </Link>
              </li>
              <li>
                <Link 
                  to="/sign" 
                  className={isActive('/sign') ? 'active' : ''}
                >
                  Identity
                </Link>
              </li>
            </ul>
          </nav>
          <div className="layout-actions">
            <div className="connection-status">
              {isConnected ? (
                <span className="connected-status">{displayWallet}</span>
              ) : (
                <span className="disconnected-status">Not Connected</span>
              )}
            </div>
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          </div>
        </div>
      </header>
      <main className="layout-main">
        <Outlet />
      </main>
      <footer className="layout-footer">
        <div className="layout-footer-content">
          <p>&copy; {new Date().getFullYear()} Tribify. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout; 