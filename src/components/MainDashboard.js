import React from 'react';
import Header from './Header';
import './MainDashboard.css';

function MainDashboard() {
  return (
    <>
      <Header title="Tribify Navigation: MainDashboard.js" />
      <div className="sitemap-container">
        <h1 className="title">Tribify Navigation</h1>

        <section>
          <h2 className="section-title">Layout Structure</h2>
          <div style={{ display: 'flex', gap: '40px' }}>
            <pre className="layout-tree">
              {`App Layout (100vw x 100vh)
├── Header (100vw x 60px)
│   ├── Close Button
│   ├── Title
│   └── Action Buttons
├── Sidebar (240px fixed)
│   ├── Brand Logo (/TRIBIFY.ai)
│   └── Navigation Menu
└── Main Content (calc(100vh - 60px))
    └── Page Content`}
            </pre>

            <pre className="layout-visual">
              {`┌──────────┬─────────────────────────────────────────────────────┐
│/TRIBIFY  │                    Header (60px)                     │
│.ai       │   ┌────┐                                  ┌────┐     │
│          │   │ ✕  │  Title                          │ ... │     │
│          │   └────┘                                  └────┘     │
│          ├─────────────────────────────────────────────────────┤
│          │                                                     │
│          │                                                     │
│          │                                                     │
│ Sidebar  │                  Main Content                       │
│  240px   │             (calc(100vh - 60px))                   │
│          │                                                     │
│          │                                                     │
│          │                                                     │
│          │                                                     │
│          │                                                     │
│          │                                                     │
└──────────┴─────────────────────────────────────────────────────┘`}
            </pre>
          </div>
        </section>

        <section>
          <h2 className="section-title">Component Tree</h2>
          <pre className="component-tree">
            {`<App>
├── <AppLayout>
│   ├── <Sidebar>
│   └── <main-content>
│       ├── <MainDashboard>  /* /app/tribify - Site Documentation */
│       ├── <WalletPage>
│       ├── <SniperPage>
│       ├── <StakePage>
│       └── etc...
└── <TribifyContext>
    └── State Management`}
          </pre>
        </section>

        <section>
          <h2 className="section-title">Route Structure</h2>
          <h3 className="subsection">MAIN</h3>
          <div className="route-item">
            <code>/app/tribify</code>
            <span>Site Documentation</span>
            <span className="tech-note">Uses main-content layout</span>
          </div>

          <h3 className="subsection">TRADING</h3>
          <div className="route-item">
            <code>/app/wallet</code>
            <span>Wallet Management</span>
            <span className="tech-note">Uses main-content layout</span>
          </div>
          <div className="route-item">
            <code>/app/sniper</code>
            <span>Token Sniper</span>
            <span className="tech-note">Uses main-content layout</span>
          </div>
          {/* ... other routes ... */}
        </section>

        <section>
          <h2 className="section-title">State Management</h2>
          <pre className="state-tree">
            {`TribifyContext
├── publicKey
├── subwallets[]
└── balances{}

Component State
├── WalletPage
│   ├── walletBalances
│   └── conversionStatus
└── SniperPage
    ├── targets[]
    └── selectedWallet`}
          </pre>
        </section>
      </div>
    </>
  );
}

export default MainDashboard; 