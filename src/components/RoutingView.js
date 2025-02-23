import React from 'react';
import { Link } from 'react-router-dom';
import './RoutingView.css';

const RoutingView = () => {
  return (
    <div className="routing-view dark">
      <nav className="routing-nav">
        <Link to="/app">← Back to App</Link>
      </nav>

      <div className="routing-content">
        <h1>🚦 Current Routing Structure</h1>
        
        <div className="route-section">
          <h2>Active Routes</h2>
          <pre>
{`📁 /
├── 📄 /routing (you are here)
├── 📄 /wallet
└── 📁 /app
    ├── 🔵 tribify.ai    (state-based view)
    │   └── AI chat interface
    ├── 🔵 shareholders  (state-based view)
    │   ├── Token holder list
    │   └── Holder analytics
    ├── 🔵 stake        (state-based view)
    │   ├── Staking interface
    │   └── APY tiers
    ├── 🔵 messages     (state-based view)
    │   ├── Direct messages
    │   └── Broadcast messages
    ├── 🔵 snipe        (state-based view)
    │   ├── Buy configuration
    │   └── Sell configuration
    ├── 🔵 sign         (state-based view)
    │   └── Message signing
    ├── 🔵 vote         (state-based view)
    │   ├── Active proposals
    │   └── Voting interface
    ├── 🔵 settings     (state-based view)
    │   ├── password
    │   ├── backup
    │   └── restore
    ├── 🔵 docs         (state-based view)
    │   └── Documentation pages
    ├── 🔵 graph        (state-based view)
    │   └── Token holder visualization
    ├── 🔵 connection   (state-based view)
    │   ├── Wallet connection
    │   └── → Redirects to /app when connected
    └── 🔵 disconnect   (state-based view)
        ├── Wallet disconnection
        └── → Redirects to / (landing page)
        
📄 / (Landing Page)
└── Phantom wallet connection required
    └── → Redirects to /app when connected`}
          </pre>
        </div>

        <div className="route-section">
          <h2>⚠️ Routing Issues</h2>
          <ul>
            <li>State-based navigation instead of proper routes</li>
            <li>No direct URL access to views</li>
            <li>Browser navigation (back/forward) doesn't work between views</li>
            <li>Can't bookmark specific views</li>
          </ul>
        </div>

        <div className="route-section">
          <h2>💡 Recommended Structure</h2>
          <pre>
{`📁 /
├── 📄 /routing
├── 📄 /wallet
└── 📁 /app
    ├── 📄 /ai          (URL-based route)
    ├── 📄 /stake       (URL-based route)
    ├── 📄 /holders     (URL-based route)
    ├── 📄 /messages    (URL-based route)
    ├── 📄 /snipe       (URL-based route)
    ├── 📄 /sign        (URL-based route)
    ├── 📄 /vote        (URL-based route)
    ├── 📄 /settings    (URL-based route)
    │   ├── /password
    │   ├── /backup
    │   └── /restore
    ├── 📄 /docs        (URL-based route)
    └── 📄 /graph       (URL-based route)`}
          </pre>
        </div>

        <div className="route-section fix-section">
          <h2>🛠 How to Fix</h2>
          <pre>
{`// Replace in App.js
<Router>
  <Routes>
    <Route path="/routing" element={<RoutingView />} />
    <Route path="/wallet" element={<WalletPage />} />
    <Route path="/app" element={<AppLayout />}>
      <Route path="ai" element={<AiView />} />
      <Route path="stake" element={<StakeView />} />
      <Route path="holders" element={<Shareholders />} />
      <Route path="messages" element={<MessagesPage />} />
      <Route path="snipe" element={<SnipePage />} />
      <Route path="sign" element={<Sign />} />
      <Route path="vote" element={<VotePage />} />
      <Route path="settings">
        <Route path="password" element={<Password />} />
        <Route path="backup" element={<Backup />} />
        <Route path="restore" element={<Restore />} />
      </Route>
      <Route path="docs" element={<Docs />} />
      <Route path="graph" element={<TokenHolderGraph />} />
      <Route index element={<Navigate to="ai" replace />} />
    </Route>
    <Route path="/" element={<Navigate to="/app" replace />} />
  </Routes>
</Router>`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default RoutingView; 