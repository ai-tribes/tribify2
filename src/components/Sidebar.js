import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './Sidebar.css';
import { 
  FaRobot, FaUsers, FaChartLine, 
  FaCrosshairs, FaWallet, FaEnvelope,
  FaVoteYea, FaFileSignature, FaBook,
  FaProjectDiagram, FaCog 
} from 'react-icons/fa';

const menuSections = [
  {
    title: 'Trading',
    items: [
      { path: '/app/wallet', label: 'Wallet', icon: <FaWallet size={16} /> },
      { path: '/app/sniper', label: 'Sniper', icon: <FaCrosshairs size={16} /> },
      { path: '/app/stake', label: 'Stake', icon: <FaChartLine size={16} /> },
    ]
  },
  {
    title: 'Analytics',
    items: [
      { path: '/app/holders', label: 'Shareholders', icon: <FaUsers size={16} /> },
      { path: '/app/graph', label: 'Graph', icon: <FaProjectDiagram size={16} /> },
    ]
  },
  {
    title: 'Community',
    items: [
      { path: '/app/messages', label: 'Messages', icon: <FaEnvelope size={16} /> },
      { path: '/app/vote', label: 'Vote', icon: <FaVoteYea size={16} /> },
      { path: '/app/sign', label: 'Sign', icon: <FaFileSignature size={16} /> },
    ]
  },
  {
    title: 'Other',
    items: [
      { path: '/app/ai', label: 'AI Chat', icon: <FaRobot size={16} /> },
      { path: '/app/docs', label: 'Docs', icon: <FaBook size={16} /> },
      { path: '/app/settings', label: 'Settings', icon: <FaCog size={16} /> },
    ]
  }
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <Link to="/app" className="logo">/TRIBIFY.ai</Link>
      </div>
      
      <div className="sidebar-content">
        {menuSections.map((section, index) => (
          <div key={index} className="menu-section">
            <div className="menu-section-title">{section.title}</div>
            {section.items.map((item) => (
              <button
                key={item.path}
                className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <span className="menu-item-icon">{item.icon}</span>
                <span className="menu-item-label">{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
};

export default Sidebar; 