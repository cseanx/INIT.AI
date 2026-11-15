/* ==========================
   STELLAR CLIENT (Testnet + Mainnet)
   Feature flag + network constants + lazily-loaded Soroban RPC helpers.
   The @stellar/stellar-sdk is imported dynamically so it never lands in the
   main bundle; with VITE_STELLAR_ENABLED=false nothing here runs.

   Network is selected explicitly with VITE_STELLAR_NETWORK:
     - "testnet" (default) — the whole app defaults here; friendbot funding.
     - "mainnet"            — real XLM fees; needs a funded wallet + mainnet
                              contract id. See docs/mainnet-runbook.md.

   If the value is anything else, the integration is disabled rather than
   silently falling back to the wrong chain.
========================== */

const env = import.meta.env;

/** SOW name first, legacy name second. */
const CONTRACT_ID_RAW: string =
    (env.VITE_SOROBAN_CONTRACT_ID as string | undefined) ??
    (env.VITE_STELLAR_CONTRACT_ID as string | undefined) ??
    '';

export type StellarNetwork = 'testnet' | 'mainnet';

const NETWORK_RAW = ((env.VITE_STELLAR_NETWORK as string | undefined) ?? 'testnet')
    .trim()
    .toLowerCase();

/** True only for the two supported networks — anything else disables Stellar. */
export const STELLAR_NETWORK_VALID: boolean = NETWORK_RAW === 'testnet' || NETWORK_RAW === 'mainnet';

/** Selected network. Only meaningful when `STELLAR_NETWORK_VALID` is true. */
export const STELLAR_NETWORK: StellarNetwork = NETWORK_RAW === 'mainnet' ? 'mainnet' : 'testnet';

/** True when the app is wired to Stellar Mainnet (real XLM fees). */
export const NETWORK_IS_MAINNET: boolean = STELLAR_NETWORK_VALID && STELLAR_NETWORK === 'mainnet';

/** Human label for badges/copy: "Testnet" or "Mainnet". */
export const NETWORK_LABEL: string = NETWORK_IS_MAINNET ? 'Mainnet' : 'Testnet';

/** `stellar.expert` path segment (same lower-case network name). */
export const EXPLORER_NETWORK: StellarNetwork = STELLAR_NETWORK;

/** Master switch: requires the flag, a contract id, and a supported network. */
export const STELLAR_ENABLED: boolean =
    env.VITE_STELLAR_ENABLED === 'true' &&
    STELLAR_NETWORK_VALID &&
    CONTRACT_ID_RAW.length > 0;

export const CONTRACT_ID: string = CONTRACT_ID_RAW;

/** Default RPC endpoint per network. */
const DEFAULT_RPC_URL = NETWORK_IS_MAINNET
    ? 'https://soroban-mainnet.stellar.org'
    : 'https://soroban-testnet.stellar.org';

/** Default Horizon endpoint per network. */
const DEFAULT_HORIZON_URL = NETWORK_IS_MAINNET
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org';

/** Soroban RPC endpoint (network default unless overridden). */
export const RPC_URL: string = (env.VITE_STELLAR_RPC_URL as string | undefined) || DEFAULT_RPC_URL;

/** Horizon REST endpoint (explorer links / transaction lookups). */
export const HORIZON_URL: string =
    (env.VITE_STELLAR_HORIZON_URL as string | undefined) || DEFAULT_HORIZON_URL;

/** Network passphrase — must match the selected network or signatures are invalid. */
export const NETWORK_PASSPHRASE: string = NETWORK_IS_MAINNET
    ? 'Public Global Stellar Network ; September 2015'
    : 'Test SDF Network ; September 2015';

/** Friendbot only exists on Testnet — Mainnet accounts must be funded with real XLM. */
export const FRIENDBOT_URL: string | null = NETWORK_IS_MAINNET ? null : 'https://friendbot.stellar.org';

/* ---------- explorer links (always the selected network) ---------- */

export function explorerTxUrl(txHash: string): string {
    return `https://stellar.expert/explorer/${EXPLORER_NETWORK}/tx/${txHash}`;
}

export function explorerAccountUrl(address: string): string {
    return `https://stellar.expert/explorer/${EXPLORER_NETWORK}/account/${address}`;
}

export function explorerContractUrl(contractId: string): string {
    return `https://stellar.expert/explorer/${EXPLORER_NETWORK}/contract/${contractId}`;
}

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
