// Barrel file for wallet feature
// This file exports all components from the wallet feature
// for simplified imports elsewhere in the application

// Export components for easier imports
export * from './components';
export * from './services';

// Default export for the main WalletPage component
export { WalletPage as default } from './components';

// Will export components once they're migrated
// export { default as WalletPage } from './WalletPage';
// export { default as FundSubwallets } from './components/FundSubwallets';
// export { default as TokenDistributor } from './components/TokenDistributor'; 