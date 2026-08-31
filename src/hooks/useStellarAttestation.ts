/* ==========================
   useStellarAttestation
   Drives the full attestation flow for one report:
   idle → hashing → (connecting) → signing → submitting → confirming → verified
   with mapped, user-friendly errors at every step.
========================== */

import { useCallback, useState } from 'react';
import { STELLAR_ENABLED } from '../services/stellar/client';
import {
    attestOnChain,
    fetchChainAttestation,
    hashReportPayload,
} from '../services/stellar/attestation';
import type {
    AttestationPhase,
    AttestationResult,
    ChainAttestation,
} from '../types/stellar';
import { useStellarWallet } from './useStellarWallet';

export interface AttestRequest {
    /**
     * Preferred: the server-authoritative hash from
     * GET /api/reports/{id}/attestation-message.
     */
    reportHash?: string;
    /** Fallback only when no server hash is available yet (offline drafts). */
    payload?: Record<string, unknown>;
    /** Short on-chain reference (the numeric INIT.AI report id). */
    reportRef: string;
    /** Optional previous hash for on-chain revision chain — null for first version. */
    prevHash?: string | null;
}

export interface UseStellarAttestation {
    enabled: boolean;
    phase: AttestationPhase;
    error: string | null;
    /** Set once the flow reaches `verified`. */
    result: AttestationResult | null;
    /** Chain record when it could be read back (best-effort). */
    chainRecord: ChainAttestation | null;
    attest: (request: AttestRequest) => Promise<AttestationResult | null>;
    reset: () => void;
}

export function useStellarAttestation(): UseStellarAttestation {
    const wallet = useStellarWallet();
    const [phase, setPhase] = useState<AttestationPhase>('idle');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<AttestationResult | null>(null);
    const [chainRecord, setChainRecord] = useState<ChainAttestation | null>(null);

    const attest = useCallback(
        async (request: AttestRequest): Promise<AttestationResult | null> => {
            if (!STELLAR_ENABLED) return null;
            setError(null);
            setResult(null);
            setChainRecord(null);

            try {
                let address = wallet.address;

                if (!address) {
                    setPhase('connecting');
                    address = await wallet.connect();
                    if (!address) {
                        setPhase('idle');
                        setError(wallet.error ?? 'Could not connect to your Freighter wallet.');
                        return null;
                    }
                }

                setPhase('hashing');
                // Server hash wins; local hashing is the offline fallback.
                const reportHash =
                    request.reportHash ?? (await hashReportPayload(request.payload ?? {}));

                // Skip the whole signing dance if this exact proof already exists.
                const existing = await fetchChainAttestation(reportHash, address).catch(() => null);
                if (existing) {
                    const res: AttestationResult = {
                        txHash: '',
                        reportHash,
                    };
                    setChainRecord(existing);
                    setPhase('verified');
                    setResult(res);
                    return res;
                }

                setPhase('signing');
                await assertNetworkSafe();

                setPhase('submitting');
                const txHash = await attestOnChain({
                    address,
                    reportHashHex: reportHash,
                    reportRef: request.reportRef,
                    prevHashHex: request.prevHash ?? null,
                });

                setPhase('confirming');
                const record = await fetchChainAttestation(reportHash, address).catch(() => null);
                if (record) setChainRecord(record);

                setPhase('verified');
                const res: AttestationResult = { txHash, reportHash };
                setResult(res);
                return res;
            } catch (err) {
                const { normalizeWalletError } = await import('../services/stellar/wallet');
                setError(normalizeWalletError(err).message);
                setPhase('idle');
                return null;
            }
        },
        [wallet],
    );

    const reset = useCallback((): void => {
        setPhase('idle');
        setError(null);
        setResult(null);
        setChainRecord(null);
    }, []);

    return { enabled: STELLAR_ENABLED, phase, error, result, chainRecord, attest, reset };
}

/** Network check happens right before asking for a signature so the user
 *  gets an actionable message instead of a failed transaction. */
async function assertNetworkSafe(): Promise<void> {
    const { assertTestnetSelected } = await import('../services/stellar/wallet');
    await assertTestnetSelected().catch((err: Error) => {
        throw err;
    });
}