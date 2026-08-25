/* ==========================
   STELLAR CLIENT (Testnet)
   Feature flag + network constants + lazily-loaded Soroban RPC helpers.
   The @stellar/stellar-sdk is imported dynamically so it never lands in
   the main bundle; with VITE_STELLAR_ENABLED=false nothing here runs.
   See contracts/soroban/README.md for deployment details.
========================== */

const env = import.meta.env;

/** SOW name first, legacy name second. */
const CONTRACT_ID_RAW: string =
    (env.VITE_SOROBAN_CONTRACT_ID as string | undefined) ??
    (env.VITE_STELLAR_CONTRACT_ID as string | undefined) ??
    '';

/**
 * Network policy: INIT.AI attestations are Testnet-only. The network name is
 * configurable for tooling, but anything other than "testnet" disables the
 * integration entirely.
 */
export const STELLAR_NETWORK: string = (env.VITE_STELLAR_NETWORK as string | undefined) ?? 'testnet';

/** Master switch: requires the flag, a contract id, AND the testnet policy. */
export const STELLAR_ENABLED: boolean =
    env.VITE_STELLAR_ENABLED === 'true' &&
    STELLAR_NETWORK === 'testnet' &&
    CONTRACT_ID_RAW.length > 0;

export const CONTRACT_ID: string = CONTRACT_ID_RAW;

/** Soroban RPC endpoint (Testnet default). */
export const RPC_URL: string =
    (env.VITE_STELLAR_RPC_URL as string | undefined) ?? 'https://soroban-testnet.stellar.org';

/** Horizon REST endpoint (Testnet default) — used by explorer links and any
 *  client-side transaction lookups. */
export const HORIZON_URL: string =
    (env.VITE_STELLAR_HORIZON_URL as string | undefined) ?? 'https://horizon-testnet.stellar.org';

/** Testnet-only network passphrase. */
export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

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
