/* ==========================
   useStellarVerification
   Asks the Soroban contract itself whether a given report hash has been
   attested, and reduces the answer to three non-technical outcomes:

     valid  — the hash IS attested on Stellar Testnet
     none   — the contract has never seen this hash
     error  — we couldn't get an answer (network/RPC problem)

   Re-runs automatically when the hash changes; `recheck()` retries manually.
========================== */

import { useCallback, useEffect, useState } from 'react';
import { STELLAR_ENABLED } from '../services/stellar/client';
import type { ChainAttestation } from '../types/stellar';

export type VerificationOutcome =
    | 'unchecked'
    | 'checking'
    | 'valid'
    | 'none'
    | 'error';

export interface UseStellarVerification {
    /** Tri-state result, understandable without blockchain knowledge. */
    outcome: VerificationOutcome;
    /** Full on-chain record when outcome === 'valid'. */
    record: ChainAttestation | null;
    /** Technical detail for outcome === 'error'. */
    error: string | null;
    /** Query the contract again. */
    recheck: () => void;
}

export function useStellarVerification(
    reportHash: string | null | undefined,
): UseStellarVerification {
    const [outcome, setOutcome] = useState<VerificationOutcome>('unchecked');
    const [record, setRecord] = useState<ChainAttestation | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!STELLAR_ENABLED || !reportHash) {
            setOutcome('unchecked');
            setRecord(null);
            setError(null);
            return;
        }
        let active = true;
        setOutcome('checking');
        setError(null);
        setRecord(null);

        void (async () => {
            try {
                const { fetchChainAttestation } = await import('../services/stellar/attestation');
                // Simulated read call — free, needs no wallet or signature.
                const rec = await fetchChainAttestation(reportHash);
                if (!active) return;
                if (rec) {
                    setRecord(rec);
                    setOutcome('valid');
                } else {
                    setOutcome('none');
                }
            } catch (err) {
                if (!active) return;
                setError(err instanceof Error ? err.message : String(err));
                setOutcome('error');
            }
        })();

        return () => {
            active = false;
        };
    }, [STELLAR_ENABLED, reportHash, attempt]);

    const recheck = useCallback((): void => setAttempt((a) => a + 1), []);

    return { outcome, record, error, recheck };
}