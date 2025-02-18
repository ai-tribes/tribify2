/**
 * Tribify Platform Context
 * 
 * Core Functionality:
 * Tribify is a Solana-based token management platform that enables users to:
 * 1. Create and manage multiple subwallets
 * 2. Distribute $TRIBIFY tokens across wallets
 * 3. Convert between $TRIBIFY, SOL, and USDC
 * 4. Manage token distributions and recoveries
 * 5. Monitor wallet balances and transactions
 *
 * Main Features:
 * 
 * 1. Wallet Management
 * - Create up to 100 subwallets
 * - Generate and backup wallet keys
 * - View all wallet balances (SOL, TRIBIFY, USDC)
 * - Recover SOL from subwallets
 * - Close ATA accounts
 * 
 * 2. Token Operations
 * - Distribute $TRIBIFY to subwallets
 * - Convert between tokens (TRIBIFY ↔ SOL ↔ USDC)
 * - Batch transfer capabilities
 * - Token recovery and consolidation
 * 
 * 3. Advanced Features
 * - Random distribution mode
 * - Batch processing (4 wallets at a time)
 * - ATA (Associated Token Account) management
 * - Private key security
 *
 * Technical Details:
 * 
 * SOL Requirements:
 * - ATA Creation: 0.002 SOL per wallet
 * - Transaction Fee: 0.000005 SOL per operation
 * - Minimum SOL for operations: varies by operation
 *
 * Common Operations:
 * 1. Creating Subwallets:
 *    - Requires parent wallet with sufficient SOL
 *    - Creates ATAs for each subwallet
 *    - Minimum 0.002 SOL per wallet for ATA
 * 
 * 2. Funding Subwallets:
 *    - Can fund 1-100 wallets at once
 *    - Processes in batches of 4
 *    - Supports random distribution
 * 
 * 3. Token Recovery:
 *    - Can recover excess SOL
 *    - Can close ATAs and recover all SOL
 *    - Transfers TRIBIFY back to parent before closing
 *
 * Quick Commands:
 * 
 * Wallet Commands:
 * /create-wallets <number> - Create specified number of subwallets
 * /backup-keys - Download wallet keys backup file
 * /show-keys - Toggle private key visibility
 * /restore-keys <file> - Restore wallets from backup
 * /close-wallet - Close current wallet session
 *
 * Token Commands:
 * /fund <amount> <number_of_wallets> - Fund subwallets with SOL
 * /fund-random <min> <max> <number_of_wallets> - Fund with random amounts
 * /distribute-tribify <amount> <number_of_wallets> - Distribute TRIBIFY
 * /recover-sol - Recover excess SOL from subwallets
 * /close-atas - Close ATAs and recover all SOL
 * /convert <from> <to> <amount> - Convert between tokens
 *
 * Information Commands:
 * /balance - Show all wallet balances
 * /scan-wallets - Scan and show subwallet states
 * /help - Show available commands
 * /explain <feature> - Get detailed explanation of a feature
 *
 * Common Questions and Answers:
 * 
 * Q: What's the minimum SOL needed to start?
 * A: For basic operations, you need:
 *    - 0.002 SOL per subwallet for ATA creation
 *    - Extra SOL for transaction fees
 *    - SOL amount you want to distribute
 *
 * Q: How do I safely backup my wallets?
 * A: Use the /backup-keys command or "Backup" button to download an encrypted backup file
 *
 * Q: What happens when closing ATAs?
 * A: The process:
 *    1. Transfers any TRIBIFY back to parent wallet
 *    2. Closes the ATA account
 *    3. Recovers the 0.002 SOL rent
 *
 * Q: How does random distribution work?
 * A: Randomly assigns amounts between min and max values to each wallet,
 *    useful for creating varied token distributions
 *
 * Error Handling:
 * - Insufficient SOL: Check parent wallet balance
 * - Failed Transactions: Usually due to network congestion, retry
 * - ATA Errors: Ensure proper account initialization
 * - Token Transfer Fails: Check token balances and addresses
 *
 * Security Notes:
 * - Never share private keys
 * - Always backup wallet keys
 * - Verify transactions before signing
 * - Keep sufficient SOL for operations
 *
 * Best Practices:
 * 1. Start with a small number of wallets for testing
 * 2. Regular backups of wallet keys
 * 3. Monitor SOL balances
 * 4. Verify addresses before transfers
 * 5. Use batch operations for efficiency
 */

// Export constants and types if needed
export const MAX_WALLETS = 100;
export const ATA_MINIMUM_SOL = 0.002;
export const TX_FEE = 0.000005;

// Add any other necessary exports or context setup 