/* ==========================
   STELLAR CLIENT (Testnet)
   Feature flag + network constants + lazily-loaded Soroban RPC helpers.
   The @stellar/stellar-sdk is imported dynamically so it never lands in
   the main bundle; with VITE_STELLAR_ENABLED=false nothing here runs.
   See contracts/soroban/README.md for deployment details.
========================== */

const env = import.meta.env;

/** Master switch: requires both the flag and a deployed contract id. */
export const STELLAR_ENABLED: boolean =
    env.VITE_STELLAR_ENABLED === 'true' && typeof env.VITE_STELLAR_CONTRACT_ID === 'string' && env.VITE_STELLAR_CONTRACT_ID.length > 0;

export const CONTRACT_ID: string = (env.VITE_STELLAR_CONTRACT_ID as string | undefined) ?? '';

/** Testnet only — INIT.AI never touches Mainnet. */
export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
export const RPC_URL = 'https://soroban-testnet.stellar.org';

/** Thrown when Stellar code is invoked while the integration is disabled. */
export class StellarDisabledError extends Error {
    constructor() {
        super('Stellar attestation is not enabled in this deployment.');
        this.name = 'StellarDisabledError';
    }
}

export function requireStellarEnabled(): void {
    if (!STELLAR_ENABLED) throw new StellarDisabledError();
}

/** Lazily construct the Soroban RPC server (SDK loaded on first use). */
export async function getServer(): Promise<import('@stellar/stellar-sdk').rpc.Server> {
    requireStellarEnabled();
    const { rpc } = await import('@stellar/stellar-sdk');
    return new rpc.Server(RPC_URL, { allowHttp: false });
}
