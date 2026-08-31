/* ==========================
   VERIFY REPORT MODAL
   Reusable confirmation + progress dialog for "Verify on Stellar".
   Owns the full phase machine (confirmation → preparing → awaiting-
   signature → submitting → confirming → success | failed) and renders
   each stage; the actual wallet/network driver is injected later via the
   `runAttestation` prop. Without a driver the flow honestly stops at the
   signature stage — nothing is faked as verified.
========================== */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../services/api';
import { prepareSignedAttestation, submitSignedAttestation } from '../../services/stellar/attestation';
import { CONTRACT_ID } from '../../services/stellar/client';
import { normalizeWalletError } from '../../services/stellar/wallet';
import type { Report } from '../../types';
import { explorerTxUrl, type ReportAttestationRecord } from '../../types/stellar';

export type VerifyPhase =
    | 'confirmation'
    | 'preparing'
    | 'awaiting-signature'
    | 'submitting'
    | 'confirming'
    | 'success'
    | 'failed';

/** Given to the chain driver so it can walk the modal through the on-chain
 *  stages and land on success/failed with REAL outcomes. */
export interface VerifyFlowControls {
    setPhase: (phase: Exclude<VerifyPhase, 'confirmation'>) => void;
    succeed: (txHash?: string) => void;
    fail: (message: string) => void;
}

interface VerifyReportModalProps {
    /** Report to attest — drives every piece of info shown. */
    report: Report | null;
    open: boolean;
    onClose: () => void;
    /** Connected wallet public key (G…), or null when disconnected. */
    walletAddress?: string | null;
    /** Called after a greenlit transaction is persisted (or confirmed on-chain) so the parent can refresh. */
    onVerified?: () => void;
    /**
     * Async attestation pipeline (wallet signature → submit → confirm).
     * Deliberately NOT wired in this step — Step 3 is UI/state only, so no
     * Freighter call and no transaction happens here yet.
     */
    runAttestation?: (controls: VerifyFlowControls) => Promise<void>;
}

const BACKDROP_CLASSES =
    'fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-[16px] backdrop-blur-[3px]';
const CARD_CLASSES =
    'w-[min(500px,100%)] rounded-[18px] border border-white/10 bg-[#101010] p-[22px] shadow-[0_24px_60px_rgba(0,0,0,.6)]';
const LABEL_CLASSES =
    'text-[10.5px] font-medium uppercase tracking-[.06em] text-[#777]';
const VALUE_CLASSES = 'min-w-0 truncate text-[13px] text-white';
const PRIMARY_BTN_CLASSES =
    'flex cursor-pointer items-center justify-center gap-2 rounded-[14px] border-none bg-gradient-to-r from-primary to-accent p-[11px_20px] text-[13px] font-semibold text-white shadow-[0_10px_30px_rgba(var(--accent-glow),.3)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(var(--accent-glow),.42)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0';
const GHOST_BTN_CLASSES =
    'cursor-pointer rounded-[14px] border border-white/12 bg-white/[.04] p-[11px_20px] text-[13px] font-semibold text-[#ccc] transition duration-200 hover:bg-white/9 hover:text-white';
const FEE_NOTE_CLASSES =
    'flex items-start gap-[8px] rounded-[12px] border border-[#ffb03a]/25 bg-[#ffb03a]/10 p-[10px_12px] text-[11.5px] leading-relaxed text-[#ffb03a]';

const PROGRESS_STEPS: { key: Exclude<VerifyPhase, 'confirmation' | 'success' | 'failed'>; label: string }[] = [
    { key: 'preparing', label: 'Preparing attestation' },
    { key: 'awaiting-signature', label: 'Awaiting wallet signature' },
    { key: 'submitting', label: 'Submitting to Stellar' },
    { key: 'confirming', label: 'Confirming on Testnet' },
];

const BUSY_PHASES: readonly VerifyPhase[] = [
    'preparing',
    'awaiting-signature',
    'submitting',
    'confirming',
];

/** Shorten long hex/addresses: first N … last M. */
function shorten(value: string, head = 10, tail = 8): string {
    return value.length <= head + tail + 2 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex min-w-0 flex-col gap-[3px]">
            <span className={LABEL_CLASSES}>{label}</span>
            <span className={VALUE_CLASSES}>{children}</span>
        </div>
    );
}

function ProgressStepper({ phase }: { phase: VerifyPhase }) {
    const currentIndex = PROGRESS_STEPS.findIndex((s) => s.key === phase);
    return (
        <ol className="flex flex-col gap-[8px]">
            {PROGRESS_STEPS.map((step, index) => {
                const done = currentIndex > index;
                const current = currentIndex === index;
                return (
                    <li
                        key={step.key}
                        className={`flex items-center gap-[10px] text-[12.5px] ${
                            current ? 'font-semibold text-accent' : done ? 'text-mint' : 'text-[#777]'
                        }`}
                    >
                        {done ? (
                            <i className="fa-solid fa-circle-check text-[13px]"></i>
                        ) : current ? (
                            <i className="fa-solid fa-spinner fa-spin text-[13px]"></i>
                        ) : (
                            <i className="fa-solid fa-circle text-[7px] opacity-50"></i>
                        )}
                        {step.label}
                        {current ? '…' : ''}
                    </li>
                );
            })}
        </ol>
    );
}

export default function VerifyReportModal({
    report,
    open,
    onClose,
    walletAddress = null,
    onVerified,
    runAttestation,
}: VerifyReportModalProps) {
    const [phase, setPhase] = useState<VerifyPhase>('confirmation');
    const [reportHash, setReportHash] = useState<string | null>(null);
    const [hashLoading, setHashLoading] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [signedXdr, setSignedXdr] = useState<string | null>(null);
    const [flowError, setFlowError] = useState<string | null>(null);
    const [persistWarning, setPersistWarning] = useState<string | null>(null);
    const [alreadyVerified, setAlreadyVerified] = useState(false);
    const [existingAttestation, setExistingAttestation] = useState<ReportAttestationRecord | null>(null);

    // Fresh machine + server-authoritative content hash whenever a report is targeted.
    // Also fetch the persisted proof history so we can detect an already-greenlit
    // attestation without requiring a wallet round-trip — avoids the misleading
    // “Freighter not installed” error when the proof is already on-chain.
    useEffect(() => {
        if (!open || !report || typeof report.id !== 'number') return;
        let active = true;
        setPhase('confirmation');
        setFlowError(null);
        setTxHash(null);
        setSignedXdr(null);
        setPersistWarning(null);
        setReportHash(null);
        setAlreadyVerified(false);
        setExistingAttestation(null);
        setHashLoading(true);
        Promise.all([api.reports.attestationMessage(report.id), api.reports.listAttestations(report.id)])
            .then(([message, records]) => {
                if (!active) return;
                setReportHash(message.hash);
                const match = records.find((r) => r.stellarHash === message.hash && r.status === 'confirmed') ?? null;
                if (match || report.attestedCurrent) {
                    setAlreadyVerified(true);
                    setExistingAttestation(match);
                }
            })
            .catch(() => {
                if (!active) return;
                setReportHash(null);
                // If the message fetch fails but the prop says verified, keep the
                // already-greenlit signal so we don't mislead with a wallet error.
                if (report.attestedCurrent) {
                    setAlreadyVerified(true);
                }
            })
            .finally(() => {
                if (active) setHashLoading(false);
            });
        return () => {
            active = false;
        };
    }, [open, report]);

    const handleClose = useCallback(() => {
        if (BUSY_PHASES.includes(phase)) return;
        onClose();
    }, [onClose, phase]);

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, handleClose]);

    const busy = BUSY_PHASES.includes(phase);

    const handleContinue = useCallback(async () => {
        // Reusable path: if a driver is injected (future submission step), delegate to it.
        if (runAttestation) {
            setFlowError(null);
            setTxHash(null);
            setSignedXdr(null);
            setPersistWarning(null);
            const controls: VerifyFlowControls = {
                setPhase: (next) => setPhase(next),
                succeed: (hash) => {
                    setTxHash(hash ?? null);
                    setPhase('success');
                    onVerified?.();
                },
                fail: (message) => {
                    setFlowError(message);
                    setPhase('failed');
                },
            };
            setPhase('preparing');
            try {
                await runAttestation(controls);
            } catch (err) {
                controls.fail(err instanceof Error ? err.message : String(err));
            }
            return;
        }

        // Attestation flow: check wallet → prepare (build + simulate) →
        // Freighter signature → submit to Testnet → confirm on-chain.
        if (!report || typeof report.id !== 'number') {
            setFlowError('Invalid report selected.');
            setPhase('failed');
            return;
        }
        // If the report's current content is already attested, the contract
        // will reject a duplicate hash during simulation. Catch this early
        // with a friendly message instead of a generic simulation error —
        // the on-chain proof is already greenlit. Use the fresh chain/DB
        // check (alreadyVerified) plus the prop as fallback.
        if (alreadyVerified || report.attestedCurrent) {
            if (existingAttestation?.txHash) {
                setTxHash(existingAttestation.txHash);
                setPersistWarning(null);
                setPhase('success');
            } else {
                setFlowError(
                    'This report version is already verified on Stellar Testnet. Each version can only be attested once — edit the report to create a new version to verify.',
                );
                setPhase('failed');
            }
            return;
        }
        if (!walletAddress) {
            setFlowError(
                'No Stellar wallet is connected. Please connect your wallet using the indicator in the header and try again.',
            );
            setPhase('failed');
            return;
        }
        if (hashLoading) return;
        if (!reportHash) {
            setFlowError('The report hash could not be loaded. Please close and try again.');
            setPhase('failed');
            return;
        }

        setFlowError(null);
        setTxHash(null);
        setSignedXdr(null);
        setPhase('preparing');
        try {
            // Let the preparing state paint before the heavy SDK + RPC work.
            await new Promise<void>((resolve) => setTimeout(resolve, 120));
            // 1-3: build `attest` invocation, simulate, prepare — then hand to
            // Freighter for the actual signature prompt.
            setPhase('awaiting-signature');
            const signed = await prepareSignedAttestation({
                address: walletAddress,
                reportHashHex: reportHash,
                reportRef: String(report.id),
            });
            setSignedXdr(signed);
            // 4-5: submit the signed transaction and wait for Testnet
            // confirmation (Freighter is no longer involved).
            const txHash = await submitSignedAttestation(signed, (next) => setPhase(next));
            setTxHash(txHash);
            setPhase('success');

            // Persist off-chain (report id + hash + tx hash + contract + wallet +
            // network). Chain confirmation is the source of truth, so a DB hiccup
            // must NOT unset "Verified" — surface it as a warning instead.
            // The transaction is already greenlit at this point; a persist
            // failure is a warning, not a verification error.
            try {
                await api.reports.recordAttestation(report.id, {
                    reportHash,
                    txHash,
                    contractId: CONTRACT_ID,
                    network: 'testnet',
                    wallet: walletAddress,
                    meta: { source: 'web', flow: 'reports-page-verify' },
                });
                setPersistWarning(null);
            } catch (err) {
                setPersistWarning(
                    `Confirmed on-chain, but saving the attestation record failed: ${
                        err instanceof Error ? err.message : String(err)
                    }`,
                );
            }
            // Notify parent so the table's Verified pill updates without a
            // manual reload — the on-chain proof is already final.
            onVerified?.();
        } catch (err) {
            const msg = normalizeWalletError(err).message;
            // Duplicate hash can also surface from the simulation step if the
            // fresh DB check raced. Treat it as already-greenlit, not a failure.
            if (msg.toLowerCase().includes('already been verified') && existingAttestation?.txHash) {
                setTxHash(existingAttestation.txHash);
                setPersistWarning(null);
                setPhase('success');
                onVerified?.();
                return;
            }
            setFlowError(msg);
            setPhase('failed');
        }
    }, [report, walletAddress, reportHash, hashLoading, runAttestation, onVerified, alreadyVerified, existingAttestation]);

    if (!open || !report) return null;

    /* ---------- progress / result shells ---------- */
    if (busy) {
        return createPortal(
            <div className={BACKDROP_CLASSES}>
                <div role="dialog" aria-modal="true" aria-label="Verifying report on Stellar" className={CARD_CLASSES}>
                    <h4 className="mb-[16px] flex items-center gap-[9px] text-[14px] font-semibold">
                        <i className="fa-solid fa-cubes text-[13px] text-accent"></i>
                        Verifying on Stellar
                    </h4>
                    <ProgressStepper phase={phase} />
                    <p className="mt-[16px] flex items-start gap-[8px] text-[11.5px] leading-relaxed text-[#888]">
                        <i className="fa-solid fa-lightbulb mt-[2px] text-[11px] text-accent"></i>
                        Keep this tab open until the transaction is confirmed.
                    </p>
                </div>
            </div>,
            document.body,
        );
    }

    if (phase === 'success') {
        const isSignedOnly = !!signedXdr && !txHash;
        return createPortal(
            <div className={BACKDROP_CLASSES}>
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={isSignedOnly ? 'Transaction signed' : 'Report verified'}
                    className={CARD_CLASSES}
                >
                    <div className="mb-[14px] flex items-center gap-[12px]">
                        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[rgba(0,255,132,.14)] text-[17px] text-mint">
                            <i className={isSignedOnly ? 'fa-solid fa-pen-nib' : 'fa-solid fa-check'}></i>
                        </span>
                        <div>
                            <h4 className="text-[14.5px] font-semibold">
                                {isSignedOnly ? 'Transaction signed' : 'Report verified'}
                            </h4>
                            <p className="text-[12px] text-[#999]">
                                {isSignedOnly
                                    ? 'Freighter has signed the attestation. It has not been submitted to the network yet.'
                                    : 'This exact report form is now recorded on Stellar Testnet.'}
                            </p>
                        </div>
                    </div>
                    {isSignedOnly && signedXdr ? (
                        <div className="mb-[6px] rounded-[10px] border border-white/10 bg-white/[.04] p-[10px_12px]">
                            <p className="mb-[6px] text-[10.5px] font-medium uppercase tracking-[.06em] text-[#777]">
                                Signed transaction (XDR)
                            </p>
                            <p
                                className="break-all font-mono text-[11px] leading-relaxed text-[#bbb]"
                                title={signedXdr}
                            >
                                {shorten(signedXdr, 32, 32)}
                            </p>
                            <p className="mt-[8px] text-[11.5px] leading-relaxed text-[#888]">
                                Submission to Testnet comes next — nothing has been written on-chain yet.
                            </p>
                        </div>
                    ) : txHash ? (
                        <a
                            className="mb-[6px] inline-flex max-w-full items-center gap-[7px] truncate text-[12.5px] text-accent hover:underline"
                            href={explorerTxUrl(txHash)}
                            target="_blank"
                            rel="noreferrer"
                            title={explorerTxUrl(txHash)}
                        >
                            <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                            Transaction {shorten(txHash)}
                        </a>
                    ) : null}
                    {persistWarning && (
                        <p className={`${FEE_NOTE_CLASSES} mb-[12px]`}>
                            <i className="fa-solid fa-triangle-exclamation mt-[2px] text-[11px]"></i>
                            <span>{persistWarning}</span>
                        </p>
                    )}
                    <div className="mt-[16px] flex justify-end">
                        <button type="button" className={PRIMARY_BTN_CLASSES} onClick={onClose}>
                            Done
                        </button>
                    </div>
                </div>
            </div>,
            document.body,
        );
    }

    if (phase === 'failed') {
        return createPortal(
            <div className={BACKDROP_CLASSES}>
                <div role="dialog" aria-modal="true" aria-label="Verification failed" className={CARD_CLASSES}>
                    <div className="mb-[12px] flex items-center gap-[12px]">
                        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[rgba(255,45,85,.14)] text-[16px] text-[#ff5577]">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                        </span>
                        <div>
                            <h4 className="text-[14.5px] font-semibold">Verification failed</h4>
                            <p className="text-[12px] text-[#999]">Nothing was written to the blockchain.</p>
                        </div>
                    </div>
                    <p className="mb-[4px] break-words rounded-[12px] border border-[rgba(255,45,85,.3)] bg-[rgba(255,45,85,.08)] p-[10px_12px] text-[12px] leading-snug text-[#ff7a94]">
                        {flowError ?? 'An unexpected error occurred.'}
                    </p>
                    <div className="mt-[16px] flex justify-end gap-[10px]">
                        <button type="button" className={GHOST_BTN_CLASSES} onClick={onClose}>
                            Close
                        </button>
                        <button
                            type="button"
                            className={PRIMARY_BTN_CLASSES}
                            onClick={() => setPhase('confirmation')}
                        >
                            <i className="fa-solid fa-rotate-right text-[11px]"></i> Try again
                        </button>
                    </div>
                </div>
            </div>,
            document.body,
        );
    }

    /* ---------- confirmation ---------- */
    const isAlreadyVerified = alreadyVerified || !!report.attestedCurrent;
    const continueDisabled = hashLoading || !reportHash || !walletAddress || isAlreadyVerified;

    return createPortal(
        <div
            className={BACKDROP_CLASSES}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) handleClose();
            }}
        >
            <div role="dialog" aria-modal="true" aria-label="Verify report on Stellar" className={CARD_CLASSES}>
                <div className="mb-[16px] flex flex-wrap items-center justify-between gap-[10px]">
                    <h4 className="flex items-center gap-[9px] text-[14.5px] font-semibold">
                        <i className="fa-solid fa-cubes text-[13px] text-accent"></i>
                        Verify on Stellar
                    </h4>
                    <span className="inline-flex items-center gap-[6px] rounded-full border border-mint/30 bg-mint/10 px-[10px] py-[4px] text-[11.5px] font-semibold text-mint">
                        <i className="fa-solid fa-link text-[10px]"></i> Stellar Testnet
                    </span>
                </div>

                <div className="mb-[14px] grid grid-cols-1 gap-[12px] sm:grid-cols-2">
                    <InfoRow label="Report">{report.title}</InfoRow>
                    <InfoRow label="Location">{report.city ?? report.area ?? '—'}</InfoRow>
                    <InfoRow label="Report Hash">
                        {hashLoading ? (
                            <span className="text-[#888]">
                                <i className="fa-solid fa-spinner fa-spin mr-[6px] text-[11px] text-accent"></i>
                                Loading…
                            </span>
                        ) : reportHash ? (
                            <span className="font-mono" title={reportHash}>
                                {shorten(reportHash)}
                            </span>
                        ) : (
                            <span className="text-[#ffb03a]">Unavailable — cannot attest right now</span>
                        )}
                    </InfoRow>
                    <InfoRow label="Network">Stellar Testnet</InfoRow>
                    <InfoRow label="Connected Wallet">
                        {walletAddress ? (
                            <span className="font-mono" title={walletAddress}>
                                {shorten(walletAddress, 6, 4)}
                            </span>
                        ) : (
                            <span className="text-[#ffb03a]">No wallet connected</span>
                        )}
                    </InfoRow>
                </div>

                <p className="mb-[12px] text-[12.5px] leading-relaxed text-[#bbb]">
                    Create an on-chain attestation for this INIT.AI report on Stellar Testnet.
                </p>

                <div className={`${FEE_NOTE_CLASSES} mb-[16px]`}>
                    <i className="fa-solid fa-coins mt-[2px] text-[11px]"></i>
                    <span>
                        A small network fee is charged by Stellar for the attestation transaction, paid from your
                        wallet's Testnet XLM balance. Testnet XLM is free and has no monetary value.
                    </span>
                </div>

                {isAlreadyVerified ? (
                    <p className="mb-[10px] flex items-start gap-[7px] rounded-[12px] border border-mint/30 bg-mint/10 p-[10px_12px] text-[11.5px] leading-relaxed text-mint">
                        <i className="fa-solid fa-circle-check mt-[2px] text-[11px]"></i>
                        <span>
                            This version is already verified on Stellar Testnet. The proof is greenlit on-chain — no
                            new transaction is needed. Edit the report to attest a new version.
                            {existingAttestation ? (
                                <>
                                    {' '}
                                    <a
                                        href={explorerTxUrl(existingAttestation.txHash)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="underline"
                                    >
                                        View transaction {existingAttestation.txHash.slice(0, 8)}…
                                    </a>
                                </>
                            ) : null}
                        </span>
                    </p>
                ) : null}

                {!walletAddress ? (
                    <p className="mb-[10px] flex items-center gap-[7px] text-[11.5px] text-[#888]">
                        <i className="fa-solid fa-wallet text-accent"></i>
                        Connect your wallet first using the indicator in the header.
                    </p>
                ) : null}

                <div className="flex justify-end gap-[10px]">
                    <button type="button" className={GHOST_BTN_CLASSES} onClick={handleClose}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={PRIMARY_BTN_CLASSES}
                        disabled={continueDisabled}
                        title={
                            isAlreadyVerified
                                ? 'Already verified — edit the report to create a new version'
                                : !walletAddress
                                  ? 'Connect a Stellar wallet first'
                                  : !reportHash && !hashLoading
                                    ? 'The report hash could not be loaded'
                                    : undefined
                        }
                        onClick={() => void handleContinue()}
                    >
                        <i className="fa-solid fa-shield-halved text-[11px]"></i>
                        {hashLoading ? 'Preparing…' : 'Continue'}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
