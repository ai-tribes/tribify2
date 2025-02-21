import React from 'react';
import ChartView from './ChartView';
import WalletPage from './WalletPage';
import Shareholders from './Shareholders';
import SnipePage from './SnipePage';
import StakeView from './StakeView';
import VotePage from './VotePage';
import Sign from './Sign';
import Password from './Password';
import Messages from './Messages';
import Backup from './Backup';
import Restore from './Restore';

function MainAppLayout({ 
  publicKey, 
  contextSubwallets,
  setContextSubwallets,
  activeView,
  setActiveView,
  onDisconnect,
  tokenHolders,
  nicknames,
  setNicknames
}) {
  return (
    <div className="app-container">
      <div className="desktop-nav">
        <div className="nav-buttons">
          <button 
            className={`nav-button ${activeView === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveView('ai')}
          >
            /tribify.ai
          </button>
          <button 
            className={`nav-button ${activeView === 'shareholders' ? 'active' : ''}`}
            onClick={() => setActiveView('shareholders')}
          >
            Shareholders
          </button>
          <button 
            className={`nav-button ${activeView === 'wallet' ? 'active' : ''}`}
            onClick={() => setActiveView('wallet')}
          >
            Wallet
          </button>
          <button 
            className={`nav-button ${activeView === 'stake' ? 'active' : ''}`}
            onClick={() => setActiveView('stake')}
          >
            Stake
          </button>
          <button 
            className={`nav-button ${activeView === 'snipe' ? 'active' : ''}`}
            onClick={() => setActiveView('snipe')}
          >
            Snipe
          </button>
          <button 
            className={`nav-button ${activeView === 'chart' ? 'active' : ''}`}
            onClick={() => setActiveView('chart')}
          >
            Chart
          </button>
          <button 
            className={`nav-button ${activeView === 'sign' ? 'active' : ''}`}
            onClick={() => setActiveView('sign')}
          >
            Sign
          </button>
          <button 
            className={`nav-button ${activeView === 'vote' ? 'active' : ''}`}
            onClick={() => setActiveView('vote')}
          >
            Vote
          </button>
          <button 
            className="nav-button"
            onClick={onDisconnect}
          >
            Disconnect
          </button>
        </div>
      </div>

      <div className="main-content">
        {activeView === 'shareholders' && (
          <div className="token-holders">
            <h3>$TRIBIFY Shareholders</h3>
            <Shareholders 
              holders={tokenHolders}
              nicknames={nicknames}
              setNicknames={setNicknames}
              setActiveView={setActiveView}
              publicKey={publicKey?.toString()}
            />
          </div>
        )}

        {activeView === 'wallet' && (
          <div className="page-container">
            <WalletPage 
              subwallets={contextSubwallets} 
              setSubwallets={setContextSubwallets}
            />
          </div>
        )}

        {activeView === 'chart' && (
          <div className="page-container">
            <ChartView />
          </div>
        )}

        {activeView === 'snipe' && (
          <div className="page-container">
            <SnipePage 
              publicKey={publicKey}
              parentBalance={0.067453326}
              subwallets={contextSubwallets}
            />
          </div>
        )}

        {activeView === 'stake' && (
          <StakeView 
            parentWallet={{
              publicKey: publicKey?.toString(),
              tribifyBalance: tokenHolders.find(h => h.address === publicKey?.toString())?.tokenBalance || 0
            }}
            tokenHolders={tokenHolders}
          />
        )}

        {activeView === 'sign' && (
          <div className="sign-container">
            <h3>Sign Messages</h3>
            <Sign />
          </div>
        )}

        {activeView === 'vote' && (
          <VotePage tokenHolders={tokenHolders} />
        )}
      </div>
    </div>
  );
}

export default MainAppLayout; 