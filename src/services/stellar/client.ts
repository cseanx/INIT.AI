/* ==========================
   STELLAR CLIENT
   Network-aware config (Testnet ↔ Mainnet at runtime) + lazily-loaded
   Soroban RPC helpers. The @stellar/stellar-sdk is imported dynamically so
   it never lands in the main bundle; with VITE_STELLAR_ENABLED=false nothing
   here runs.

   The active network lives in `network.ts` and can be changed at runtime
   from the header toggle. Every helper below reads it at call time — never
   capture a network constant at module scope in feature code.
========================== */

export {
    DEFAULT_NETWORK,
    IS_MAINNET_CONTRACT_CONFIGURED,
    STELLAR_ENABLED,
    STELLAR_NETWORK_VALID,
    getActiveConfig,
    getActiveNetwork,
    getNetworkConfig,
    isNetworkAvailable,
    networkAvailability,
    setActiveNetwork,
    subscribeNetwork,
} from './network';
export type { StellarNetwork, StellarNetworkConfig } from './network';

import {
    STELLAR_ENABLED,
    getActiveConfig,
    getActiveNetwork,
    getNetworkConfig,
    isNetworkAvailable,
    type StellarNetwork,
} from './network';

/** Thrown when Stellar code is invoked while the integration is disabled. */
export class StellarDisabledError extends Error {
    constructor(message = 'Stellar attestation is not enabled in this deployment.') {
        super(message);
        this.name = 'StellarDisabledError';
    }
}

export function requireStellarEnabled(network: StellarNetwork = getActiveNetwork()): void {
    if (!STELLAR_ENABLED) throw new StellarDisabledError();
    if (!isNetworkAvailable(network)) {
        throw new StellarDisabledError(
            `${getNetworkConfig(network).label} is not available in this deployment yet ` +
                '(no contract id configured for that network).',
        );
    }
}

/** Lazily construct the Soroban RPC server for the active network. */
export async function getServer(
    network: StellarNetwork = getActiveNetwork(),
): Promise<import('@stellar/stellar-sdk').rpc.Server> {
    requireStellarEnabled(network);
    const { rpc } = await import('@stellar/stellar-sdk');
    return new rpc.Server(getNetworkConfig(network).rpcUrl, { allowHttp: false });
}

/* ---------- explorer links (follow the active network by default) ---------- */

export function explorerTxUrl(txHash: string, network: StellarNetwork = getActiveNetwork()): string {
    return `https://stellar.expert/explorer/${getNetworkConfig(network).explorerPath}/tx/${txHash}`;
}

export function explorerAccountUrl(
    address: string,
    network: StellarNetwork = getActiveNetwork(),
): string {
    return `https://stellar.expert/explorer/${getNetworkConfig(network).explorerPath}/account/${address}`;
}

export function explorerContractUrl(
    contractId: string,
    network: StellarNetwork = getActiveNetwork(),
): string {
    return `https://stellar.expert/explorer/${getNetworkConfig(network).explorerPath}/contract/${contractId}`;
}

/** Convenience: the config for the active network (re-exported for parity). */
export function activeConfig() {
    return getActiveConfig();
}
