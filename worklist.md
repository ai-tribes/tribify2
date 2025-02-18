# Tribify.ai Development Worklist

## High Priority

### Transaction Batching
- [ ] Implement batching for multiple transactions
- [ ] Reduce number of required signatures
- [ ] Optimize for gas efficiency

> This is critical and should be tackled first. We can use TransactionBuilder to combine multiple instructions into a single transaction. Key challenges:
> - Need to handle failed transactions gracefully
> - Must respect Solana's transaction size limits
> - Should implement retry logic for failed batches
> - Consider using versioned transactions for better throughput

### Swap Integration
- [ ] Fix Pump.fun transaction signing
- [ ] Complete conversion modals
- [ ] Test with small amounts first

> The Pump.fun integration is proving tricky. Suggestions:
> - Consider Jupiter as a backup DEX - it's more documented
> - Need to analyze successful Pump.fun transactions on-chain
> - Should implement slippage protection
> - Current issue seems to be with instruction format

### Messaging System
- [ ] Troubleshoot Pusher integration
- [ ] Implement server-side messaging
- [ ] Add real-time updates

> Pusher might be overkill. Consider:
> - Server-Sent Events (SSE) for simpler one-way updates
> - WebSocket direct connection
> - Or even polling with exponential backoff for MVP

## Medium Priority

### Documentation
- [ ] Complete docs page
- [ ] Add API documentation
- [ ] Include usage examples

> Documentation is crucial but can be built incrementally:
> - Start with basic usage guides
> - Add video tutorials
> - Document common errors and solutions

### Trading Configuration
- [ ] Build BuyConfigModal Component
  - [ ] Implement UI from screenshot
    - [ ] Wallet & Amount settings section
    - [ ] Transaction settings section
    - [ ] Time settings section
    - [ ] Budget section
  - [ ] Add state management
  - [ ] Connect Randomize/Save/Start buttons
  - [ ] Add validation logic
  - [ ] Implement transaction sequence

- [ ] Build SellConfigModal Component
  - [ ] Mirror BuyConfigModal structure
  - [ ] Adapt settings for sell operations
  - [ ] Add sell-specific validations
  - [ ] Implement sell sequence

> New modals development plan:
> - Create as separate components from ConversionModal
> - Use same styling system for consistency
> - Implement proper state management
> - Add comprehensive input validation
> - Build transaction execution system
> - Include progress tracking

### Wallet Management
- [ ] Improve wallet tracking in modals
- [ ] Test external funding wallet integration
- [ ] Investigate multiple Phantom wallet connections

> Multiple wallet connections is tricky. Options:
> - Could use different adapters (Phantom + Solflare)
> - Or implement wallet switching
> - Need to maintain clear state management
> - Consider using wallet-adapter-react hooks

## Future Features

### Token Sniping
- [ ] Add general CA functions
- [ ] Enable sniping for any token
- [ ] Implement conversion to Tribify

> This could be a killer feature but needs careful implementation:
> - Need robust token validation
> - Must protect users from scam tokens
> - Consider implementing token analysis tools
> - Add liquidity checking

### Voting System
- [ ] Verify Cursor's implementation
- [ ] Design voting mechanism
- [ ] Implement if needed

> Lower priority. If implemented:
> - Use on-chain voting for transparency
> - Consider token-weighted voting
> - Need anti-manipulation measures

## Technical Debt

### Performance
- [ ] Investigate RPC rate limiting with Helius
- [ ] Research JITO integration
- [ ] Test random distributions

> RPC issues are critical:
> - Consider RPC endpoint fallbacks
> - Implement caching where possible
> - JITO could help with MEV protection
> - Need to understand Helius pricing tiers

### Security
- [ ] Audit wallet connections
- [ ] Verify transaction security
- [ ] Test external wallet funding

> Security is paramount:
> - Need thorough transaction simulation
> - Implement spending limits
> - Add warning systems for suspicious actions
> - Consider professional audit

## Questions to Resolve
1. How to handle multiple Phantom wallet connections?
2. What is the optimal batching strategy for transactions?
3. How to implement time-based Caldera features?
4. What is JITO and how can we integrate it?
5. How to optimize RPC calls with Helius rate limits?

> Key questions to address:
> - Multiple connections might need wallet-adapter modifications
> - Batching strategy depends on instruction types
> - Caldera features need careful timing mechanisms
> - JITO helps with MEV but needs integration work
> - Helius optimization might need request bundling 