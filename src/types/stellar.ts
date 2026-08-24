/* ==========================
   STELLAR TYPES (Testnet)
   Shared shapes for the Soroban attestation layer. See
   contracts/soroban/README.md for the deployed contract details.
========================== */

/** An attestation record as stored on-chain by SpatialAttestationRegistry. */
export interface ChainAttestation {
    /** SHA-256 hex of the canonical report payload (64 chars). */
    hash: string;
    /** INIT.AI report id (short string reference stored on-chain). */
    reportId: string;
    /** Stellar account (G…) that submitted the attestation. */
    submitter: string;
    /** Ledger sequence at attestation time. */
    ledgerSequence: number;
    /** Ledger unix timestamp (seconds) at attestation time. */
    recordedAt: number;
}

/** State machine phases for an in-flight attestation. */
export type AttestationPhase =
    | 'idle'
    | 'hashing'
    | 'connecting'
    | 'signing'
    | 'submitting'
    | 'confirming'
    | 'verified';

/** Result of a successful attestation. */
export interface AttestationResult {
    /** On-chain transaction hash (explorer link target). */
    txHash: string;
    /** SHA-256 hex of the canonical payload (what was proven). */
    reportHash: string;
}

/** Wallet session exposed to the UI. */
export interface StellarWalletState {
    /** Connected public key (G…), or null when disconnected. */
    address: string | null;
    /** True while waiting on the wallet extension. */
    connecting: boolean;
}

/** Off-chain persisted attestation record (from FastAPI). */
export interface ReportAttestationRecord {
    id: number;
    reportId: number;
    /** SHA-256 hex of the canonical payload at attestation time. */
    stellarHash: string;
    txHash: string;
    contractId: string;
    network: string;
    wallet: string;
    status: string;
    meta: Record<string, unknown> | null;
    lastVerifiedAt: string | null;
    createdAt: string;
}

/** Body for POST /api/reports/{id}/attestation. */
export interface RecordAttestationBody {
    reportHash: string;
    txHash: string;
    contractId: string;
    network: string;
    wallet: string;
    meta?: Record<string, unknown>;
}

/** Server-authoritative hash message (GET …/attestation-message). */
export interface AttestationMessage {
    reportId: string;
    hash: string;
    canonicalPayload: string;
}

/** Explorer base for Testnet transactions. */
export const TESTNET_EXPLORER_TX_BASE = 'https://stellar.expert/explorer/testnet/tx/';

export function explorerTxUrl(txHash: string): string {
    return `${TESTNET_EXPLORER_TX_BASE}${txHash}`;
}