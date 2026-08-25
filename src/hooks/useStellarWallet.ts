/* Global Stellar wallet session — state lives in StellarWalletProvider
   (mounted in main.tsx) so the header, reports page, and attestation flow
   all share one connection. This file keeps the historical import path. */

export { useStellarWallet } from '../services/stellar/WalletContext';
export type { StellarWalletContextValue as UseStellarWallet } from '../services/stellar/WalletContext';