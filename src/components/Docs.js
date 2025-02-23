import React from 'react';

const DOCS_CONTENT = `
# Tribify Token Gateway

Welcome token holder! Since you have $TRIBIFY tokens, you can access this documentation.

## How Tribify Works

1. **Payment Flow**
   - User connects Phantom wallet
   - Pays 0.001 SOL
   - Receives 100 $TRIBIFY tokens

2. **Technical Implementation**
   - Frontend in React
   - Vercel serverless API
   - Solana token distribution

3. **Smart Contract Details**
   - Token: $TRIBIFY
   - Mint: 672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump
   - Treasury: DRJMA5AgMTGP6jL3uwgwuHG2SZRbNvzHzU8w8twjDnBv

## Token Uses
1. Access to documentation
2. Future governance
3. Community membership
`;

const Docs = () => {
  return (
    <div className="docs-container" style={{
      padding: '2rem',
      maxWidth: '800px',
      margin: '0 auto',
      color: '#fff'
    }}>
      <div style={{
        whiteSpace: 'pre-wrap',
        fontFamily: 'monospace',
        lineHeight: '1.6'
      }}>
        {DOCS_CONTENT}
      </div>
    </div>
  );
};

export default Docs; 