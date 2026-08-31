/* ==========================
   STELLAR ATTESTATION
   Canonical hashing + SpatialAttestationRegistry invocation + confirmation.
   The heavy SDK is loaded dynamically; every entry point checks the flag.

   Hash input = the exact canonical JSON the report builder produces
   (buildReportPayload), serialized with sorted keys so the same logical
   report always yields the same SHA-256. The FastAPI/PostGIS record remains
   the source of truth; the chain stores only the 32-byte proof.
========================== */

import type { ChainAttestation } from '../../types/stellar';
import {
    CONTRACT_ID,
    NETWORK_PASSPHRASE,
    getServer,
    requireStellarEnabled,
} from './client';
import { assertTestnetSelected, normalizeWalletError, signTransaction } from './wallet';

const CONFIRM_TIMEOUT_MS = 90_000;
const CONFIRM_POLL_MS = 3_000;

/* ---------- canonical hashing ---------- */

/** Deterministic JSON: object keys sorted recursively, arrays in order.
 *  Stable across sessions and machines. */
export function canonicalize(value: unknown): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
    if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
    const record = value as Record<string, unknown>;
    return (
        '{' +
        Object.keys(record)
            .sort()
            .map((k) => `${JSON.stringify(k)}:${canonicalize(record[k])}`)
            .join(',') +
        '}'
    );
}

/** SHA-256 of a string, hex-encoded (WebCrypto — needs https or localhost). */
export async function sha256Hex(text: string): Promise<string> {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/** Convenience: canonical JSON + hash for a report payload object. */
export async function hashReportPayload(payload: Record<string, unknown>): Promise<string> {
    return sha256Hex(canonicalize(payload));
}

/* ---------- attestation ---------- */

export interface AttestOptions {
    /** Connected wallet public key (G…). */
    address: string;
    /** 64-char hex SHA-256 of the canonical payload. */
    reportHashHex: string;
    /** Short on-chain reference (the numeric INIT.AI report id). */
    reportRef: string;
}

/** Prepare the `attest` transaction and obtain a Freighter signature.
 *  Stops before submission — the signed XDR is returned for the caller to
 *  submit in a later step. Reuses the single StellarWalletsKit wallet
 *  session; Freighter itself presents the signing prompt. */
export async function prepareSignedAttestation({
    address,
    reportHashHex,
    reportRef,
}: AttestOptions): Promise<string> {
    requireStellarEnabled();
    const { Address, Contract, TransactionBuilder, nativeToScVal, xdr } =
        await import('@stellar/stellar-sdk');
    const server = await getServer();

    await assertTestnetSelected();

    const source = await server.getAccount(address).catch((err: unknown) => {
        // 404 = the account doesn't exist on Testnet; anything else is RPC/network trouble.
        const status = (err as { status?: number } | null)?.status;
        if (status === 404) {
            throw new Error(
                'Your Stellar account is not reachable on Testnet. Fund it via the friendbot faucet and try again.',
            );
        }
        throw new Error(
            'Could not reach the Stellar Testnet network (RPC error). Check your connection and try again.',
        );
    });

    const contract = new Contract(CONTRACT_ID);
    const operation = contract.call(
        'attest',
        new Address(address).toScVal(),
        // scvBytes converts to the contract's BytesN<32> parameter.
        xdr.ScVal.scvBytes(hexToBytes32(reportHashHex)),
        nativeToScVal(reportRef, { type: 'string' }),
    );

    let tx = new TransactionBuilder(source, { fee: '10000', networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(operation)
        .setTimeout(120)
        .build();

    // Simulation pass: fills resources/footprint for Soroban ops.
    try {
        tx = await server.prepareTransaction(tx);
    } catch (err) {
        // Preserve duplicate detection: the contract panics with
        // "attestation already exists for this report hash" — surface that
        // as a friendly already-verified message instead of a generic
        // simulation error. The SDK may nest the panic in different shapes,
        // so flatten the error.
        const raw = err instanceof Error ? err.message : String(err);
        let flattened = '';
        try {
            flattened = JSON.stringify(err);
        } catch {
            flattened = String(err);
        }
        const haystack = `${raw} ${flattened}`.toLowerCase();
        if (haystack.includes('already exists') || haystack.includes('already attested')) {
            throw new Error(
                'This report has already been verified on Stellar Testnet. Each report version can only be attested once — edit the report to create a new version to verify.',
            );
        }
        throw new Error(
            'The attestation transaction could not be simulated on Stellar Testnet. The contract may be unavailable, or the network is unreachable — try again shortly.',
        );
    }

    try {
        return await signTransaction(tx.toXdr(), address);
    } catch (err) {
        throw normalizeWalletError(err);
    }
}

/** Submit an already-signed `attest` transaction to Stellar Testnet and
 *  wait for ledger confirmation. Does NOT sign — `prepareSignedAttestation`
 *  must run first (Freighter only signs once). `onPhase` lets the caller
 *  surface the submitting → confirming UI transition during polling.
 *  Returns the transaction hash. */
export async function submitSignedAttestation(
    signedXdr: string,
    onPhase?: (phase: 'submitting' | 'confirming') => void,
): Promise<string> {
    requireStellarEnabled();
    const { TransactionBuilder } = await import('@stellar/stellar-sdk');
    const server = await getServer();

    const signed = TransactionBuilder.fromXdr(signedXdr, NETWORK_PASSPHRASE);
    onPhase?.('submitting');
    let sent;
    try {
        sent = await server.sendTransaction(signed);
    } catch {
        throw new Error(
            'Could not submit the transaction to Stellar Testnet (RPC error). Check your connection and try again.',
        );
    }
    if (sent.status === 'ERROR') {
        throw new Error('The network rejected the transaction before it entered a ledger.');
    }

    onPhase?.('confirming');
    await waitForConfirmation(server, sent.hash);
    return sent.hash;
}

/** Sign + submit `attest`, then wait for Testnet confirmation.
 *  Returns the transaction hash. */
export async function attestOnChain(options: AttestOptions): Promise<string> {
    const signedXdr = await prepareSignedAttestation(options);
    return submitSignedAttestation(signedXdr);
}

/** Poll the RPC until the transaction lands or times out. */
async function waitForConfirmation(
    server: import('@stellar/stellar-sdk').rpc.Server,
    txHash: string,
): Promise<void> {
    const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
    while (Date.now() < deadline) {
        await sleep(CONFIRM_POLL_MS);
        const res = await server.getTransaction(txHash).catch(() => null);
        if (!res) continue;
        if (res.status === 'SUCCESS') return;
        if (res.status === 'FAILED') {
            throw new Error('The attestation transaction failed on-chain.');
        }
    }
    throw new Error(
        'Timed out waiting for Testnet confirmation — the network may be slow or unavailable. The transaction might still confirm; check the explorer shortly.',
    );
}

/** Read an attestation back from the chain by report hash (free simulated read). */
export async function fetchChainAttestation(
    reportHashHex: string,
    readerAddress?: string,
): Promise<ChainAttestation | null> {
    requireStellarEnabled();
    const { Account, Contract, TransactionBuilder, scValToNative, xdr } =
        await import('@stellar/stellar-sdk');
    const server = await getServer();

    // Simulated reads don't submit, but the builder needs a plausible
    // account. Contract ids are NOT valid Account ids — use a fixed
    // throwaway G-account; the sequence number is irrelevant for simulation.
    const READ_ONLY_SOURCE_ID = 'GAVQ7SYP6ZTGDASVMOVA3SNO2IAJIJYH6F6BOFWX465CPMQ4GVIO43LS';
    let source;
    try {
        source = await server.getAccount(readerAddress ?? READ_ONLY_SOURCE_ID);
    } catch {
        source = new Account(READ_ONLY_SOURCE_ID, '0');
    }

    const contract = new Contract(CONTRACT_ID);
    const tx = new TransactionBuilder(source, {
        fee: '100',
        networkPassphrase: NETWORK_PASSPHRASE,
    })
        .addOperation(contract.call('verify', xdr.ScVal.scvBytes(hexToBytes32(reportHashHex))))
        .setTimeout(60)
        .build();

    const sim = await server.simulateTransaction(tx);
    // SDK v17 exposes a singular `result`; older shapes used results[].
    const simAny = sim as typeof sim & {
        result?: { retval?: import('@stellar/stellar-sdk').xdr.ScVal };
        results?: { retval?: import('@stellar/stellar-sdk').xdr.ScVal }[];
    };
    const retval = simAny.result?.retval ?? simAny.results?.[0]?.retval;
    if (!retval) return null;

    const native = scValToNative(retval) as {
        hash?: Uint8Array | number[];
        report_id?: string;
        submitter?: string;
        ledger_sequence?: number | bigint;
        recorded_at?: number | bigint;
    } | null;

    if (!native?.hash) return null;
    return {
        hash: bytesToHex(native.hash),
        reportId: String(native.report_id ?? ''),
        submitter: String(native.submitter ?? ''),
        ledgerSequence: Number(native.ledger_sequence ?? 0),
        recordedAt: Number(native.recorded_at ?? 0),
    };
}

/* ---------- helpers ---------- */

function hexToBytes32(hex: string): Uint8Array {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
        throw new Error('Report hash must be a 64-character hex SHA-256.');
    }
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    return out;
}

function bytesToHex(bytes: Uint8Array | number[]): string {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}