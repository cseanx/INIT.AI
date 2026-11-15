/* ==========================
   STELLAR NETWORK CONFIG
   Runtime Testnet ↔ Mainnet selection.

   Build-time inputs:
     VITE_STELLAR_ENABLED=true
     VITE_STELLAR_NETWORK=testnet|mainnet        (initial/default network)
     VITE_SOROBAN_CONTRACT_ID / VITE_STELLAR_CONTRACT_ID      (Testnet)
     VITE_MAINNET_SOROBAN_CONTRACT_ID / ..._STELLAR_CONTRACT_ID (Mainnet)
   Optional per-network endpoint overrides:
     VITE_TESTNET_RPC_URL / VITE_TESTNET_HORIZON_URL
     VITE_MAINNET_RPC_URL / VITE_MAINNET_HORIZON_URL
     VITE_STELLAR_RPC_URL / VITE_STELLAR_HORIZON_URL  (applies to default network)

   Mainnet is only selectable when a Mainnet contract id is configured.
   A deployment can therefore ship the toggle safely before the contract
   exists: the option is visible but disabled with an explanation.
========================== */

const env = import.meta.env;

export type StellarNetwork = 'testnet' | 'mainnet';

const BUILD_FLAG = env.VITE_STELLAR_ENABLED === 'true';

const RAW_DEFAULT = ((env.VITE_STELLAR_NETWORK as string | undefined) ?? 'testnet')
    .trim()
    .toLowerCase();

/** True only for the two supported networks — anything else disables Stellar. */
export const STELLAR_NETWORK_VALID: boolean = RAW_DEFAULT === 'testnet' || RAW_DEFAULT === 'mainnet';

/** Network used when the user has no saved preference. */
export const DEFAULT_NETWORK: StellarNetwork = RAW_DEFAULT === 'mainnet' ? 'mainnet' : 'testnet';

const TESTNET_CONTRACT_ID = (
    (env.VITE_SOROBAN_CONTRACT_ID as string | undefined) ??
    (env.VITE_STELLAR_CONTRACT_ID as string | undefined) ??
    ''
).trim();

const MAINNET_CONTRACT_ID = (
    (env.VITE_MAINNET_SOROBAN_CONTRACT_ID as string | undefined) ??
    (env.VITE_MAINNET_STELLAR_CONTRACT_ID as string | undefined) ??
    ''
).trim();

const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';
const MAINNET_PASSPHRASE = 'Public Global Stellar Network ; September 2015';

export interface StellarNetworkConfig {
    network: StellarNetwork;
    /** "Testnet" / "Mainnet" for UI copy. */
    label: string;
    isMainnet: boolean;
    networkPassphrase: string;
    rpcUrl: string;
    horizonUrl: string;
    /** Contract this network's attestations are written to ('' when none). */
    contractId: string;
    /** `stellar.expert` path segment. */
    explorerPath: string;
    /** Friendbot exists only on Testnet. */
    friendbotUrl: string | null;
}

function endpoint(
    network: StellarNetwork,
    kind: 'RPC_URL' | 'HORIZON_URL',
    fallback: string,
    defaultNetwork: StellarNetwork,
): string {
    const prefix = network === 'mainnet' ? 'VITE_MAINNET_' : 'VITE_TESTNET_';
    const specific = env[`${prefix}${kind}`] as string | undefined;
    if (specific) return specific;
    // Legacy/general override applies to the build default network only, so a
    // stray VITE_STELLAR_RPC_URL can never misroute the other chain.
    if (network === defaultNetwork) {
        const general = env[`VITE_STELLAR_${kind}`] as string | undefined;
        if (general) return general;
    }
    return fallback;
}

const CONFIGS: Record<StellarNetwork, StellarNetworkConfig> = {
    testnet: {
        network: 'testnet',
        label: 'Testnet',
        isMainnet: false,
        networkPassphrase: TESTNET_PASSPHRASE,
        rpcUrl: endpoint(
            'testnet',
            'RPC_URL',
            'https://soroban-testnet.stellar.org',
            DEFAULT_NETWORK,
        ),
        horizonUrl: endpoint(
            'testnet',
            'HORIZON_URL',
            'https://horizon-testnet.stellar.org',
            DEFAULT_NETWORK,
        ),
        contractId: TESTNET_CONTRACT_ID,
        explorerPath: 'testnet',
        friendbotUrl: 'https://friendbot.stellar.org',
    },
    mainnet: {
        network: 'mainnet',
        label: 'Mainnet',
        isMainnet: true,
        networkPassphrase: MAINNET_PASSPHRASE,
        rpcUrl: endpoint(
            'mainnet',
            'RPC_URL',
            'https://soroban-mainnet.stellar.org',
            DEFAULT_NETWORK,
        ),
        horizonUrl: endpoint(
            'mainnet',
            'HORIZON_URL',
            'https://horizon.stellar.org',
            DEFAULT_NETWORK,
        ),
        contractId: MAINNET_CONTRACT_ID,
        explorerPath: 'public',
        friendbotUrl: null,
    },
};

export function getNetworkConfig(network: StellarNetwork): StellarNetworkConfig {
    return CONFIGS[network];
}

/** A network is usable when the flag is on and it has a contract id. */
export function isNetworkAvailable(network: StellarNetwork): boolean {
    return BUILD_FLAG && STELLAR_NETWORK_VALID && CONFIGS[network].contractId.length > 0;
}

/** Any network usable in this build (drives whether Stellar UI appears). */
export const STELLAR_ENABLED: boolean =
    isNetworkAvailable('testnet') || isNetworkAvailable('mainnet');

export const IS_MAINNET_CONTRACT_CONFIGURED: boolean =
    BUILD_FLAG && STELLAR_NETWORK_VALID && MAINNET_CONTRACT_ID.length > 0;

const STORAGE_KEY = 'initai_stellar_network';

function readStoredNetwork(): StellarNetwork | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === 'testnet' || raw === 'mainnet') return raw;
    } catch {
        /* private mode */
    }
    return null;
}

function initialNetwork(): StellarNetwork {
    const stored = readStoredNetwork();
    if (stored && isNetworkAvailable(stored)) return stored;
    if (isNetworkAvailable(DEFAULT_NETWORK)) return DEFAULT_NETWORK;
    if (isNetworkAvailable('testnet')) return 'testnet';
    if (isNetworkAvailable('mainnet')) return 'mainnet';
    return DEFAULT_NETWORK;
}

let activeNetwork: StellarNetwork = initialNetwork();
const listeners = new Set<() => void>();

/** Network currently used by every Stellar call. */
export function getActiveNetwork(): StellarNetwork {
    return activeNetwork;
}

/** Config for the network currently in use. */
export function getActiveConfig(): StellarNetworkConfig {
    return CONFIGS[activeNetwork];
}

/**
 * Switch networks at runtime. Refuses unavailable networks (e.g. Mainnet
 * before its contract is configured) so no call can target a chain the app
 * cannot attest on. Returns true when the active network changed.
 */
export function setActiveNetwork(next: StellarNetwork): boolean {
    if (!isNetworkAvailable(next)) return false;
    if (next === activeNetwork) return true;
    activeNetwork = next;
    try {
        localStorage.setItem(STORAGE_KEY, next);
    } catch {
        /* private mode — session only */
    }
    listeners.forEach((listener) => listener());
    return true;
}

export function subscribeNetwork(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/** Testnet + Mainnet availability, for the header toggle. */
export function networkAvailability(): Record<StellarNetwork, boolean> {
    return {
        testnet: isNetworkAvailable('testnet'),
        mainnet: isNetworkAvailable('mainnet'),
    };
}
