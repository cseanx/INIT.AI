import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { CONTRACT_ID, STELLAR_ENABLED } from '../../services/stellar/client';
import { explorerTxUrl } from '../../types/stellar';
import type { AttestationMessage, ReportAttestationRecord } from '../../types/stellar';
import { useStellarAttestation } from '../../hooks/useStellarAttestation';
import { useStellarWallet } from '../../hooks/useStellarWallet';
import { useStellarVerification } from '../../hooks/useStellarVerification';
import type { Report } from '../../types';

const PANEL_CLASSES =
    'rounded-[16px] border border-white/6 bg-white/[.03] p-[18px]';
const CHIP_CLASSES =
    'inline-flex items-center gap-[6px] rounded-full px-[10px] py-[4px] text-[11.5px] font-semibold';
const LINK_CLASSES = 'text-accent hover:underline';

/** Shorten long hex for display: first 10 … last 8. */
function shorten(value: string): string {
    return value.length <= 20 ? value : `${value.slice(0, 10)}…${value.slice(-8)}`;
}

/** Plain-language chain status, straight from the Soroban contract. */
function VerificationStatusLine({
    verification,
    suppressNone,
}: {
    verification: ReturnType<typeof useStellarVerification>;
    /** Hide the "not attested" line when our DB already shows a proof card. */
    suppressNone?: boolean;
}) {
    const { outcome, recheck } = verification;
    if (outcome === 'unchecked' || outcome === 'checking') {
        return (
            <p className="flex items-center gap-[7px] text-[11.5px] text-[#888]">
                <i className="fa-solid fa-spinner fa-spin text-accent"></i>
                Checking the Stellar network…
            </p>
        );
    }
    if (outcome === 'valid') {
        return (
            <p className="flex items-center gap-[7px] text-[11.5px] text-mint">
                <i className="fa-solid fa-circle-check"></i>
                Confirmed on the Stellar Testnet blockchain — this exact report form is permanently recorded.
            </p>
        );
    }
    if (outcome === 'none') {
        if (suppressNone) return null;
        return (
            <p className="flex items-center gap-[7px] text-[11.5px] text-[#888]">
                <i className="fa-solid fa-circle-info text-accent"></i>
                This report version has not been recorded on Stellar yet.
            </p>
        );
    }
    // error
    return (
        <p className="flex flex-wrap items-center gap-[7px] rounded-[10px] border border-[#ffb03a]/25 bg-[#ffb03a]/10 p-[8px_12px] text-[11.5px] text-[#ffb03a]">
            <i className="fa-solid fa-wifi"></i>
            We couldn't reach the Stellar network just now.
            <button type="button" onClick={recheck} className={`${LINK_CLASSES} cursor-pointer font-semibold`}>
                Try again
            </button>
        </p>
    );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex min-w-0 flex-col gap-[2px]">
            <span className="text-[10.5px] font-medium uppercase tracking-[.06em] text-[#777]">{label}</span>
            <span className="min-w-0 truncate text-[12.5px] text-white" title={undefined}>
                {children}
            </span>
        </div>
    );
}

/**
 * Stellar attestation panel for a saved report.
 * Renders nothing when the integration is disabled or the report only
 * exists locally (no server hash to prove).
 */
export default function StellarVerifyPanel({ report }: { report: Report }) {
    const enabled = STELLAR_ENABLED && typeof report.id === 'number';
    const wallet = useStellarWallet();
    const att = useStellarAttestation();

    const [message, setMessage] = useState<AttestationMessage | null>(null);
    const [records, setRecords] = useState<ReportAttestationRecord[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (typeof report.id !== 'number') return;
        try {
            const [msg, recs] = await Promise.all([
                api.reports.attestationMessage(report.id),
                api.reports.listAttestations(report.id),
            ]);
            setMessage(msg);
            setRecords(recs);
        } catch {
            setMessage(null);
            setRecords([]);
        } finally {
            setLoaded(true);
        }
    }, [report.id]);

    useEffect(() => {
        if (enabled) void refresh();
    }, [enabled, refresh]);

    // Chain-truth check: ask the contract itself, independent of our database.
    const verification = useStellarVerification(message?.hash ?? null);

    const currentProof =
        records.find((r) => r.stellarHash === message?.hash && r.status === 'confirmed') ?? null;

    const busy = att.phase !== 'idle' && att.phase !== 'verified';

    const handleVerify = useCallback(async () => {
        if (!message || typeof report.id !== 'number') return;
        setSaveError(null);
        const result = await att.attest({ reportHash: message.hash, reportRef: String(report.id) });
        if (!result) return;

        // Persist the proof off-chain once the chain confirmed it.
        try {
            await api.reports.recordAttestation(report.id, {
                reportHash: result.reportHash,
                txHash: result.txHash,
                contractId: CONTRACT_ID,
                network: 'testnet',
                wallet: wallet.address ?? '',
                meta: { source: 'web' },
            });
            await refresh();
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : String(err));
        }
    }, [att, message, refresh, report.id, wallet.address]);

    if (!enabled) return null;

    /* ---------- verified state ---------- */
    if (currentProof) {
        return (
            <section className={PANEL_CLASSES}>
                <div className="mb-[14px] flex flex-wrap items-center justify-between gap-[10px]">
                    <h4 className="flex items-center gap-[9px] text-[13.5px] font-semibold">
                        <i className="fa-solid fa-circle-check text-[13px] text-mint"></i>
                        Verified on Stellar
                    </h4>
                    <span className={`${CHIP_CLASSES} border border-mint/30 bg-mint/10 text-mint`}>
                        <i className="fa-solid fa-link text-[10px]"></i> Testnet
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
                    <MetaRow label="Report Hash">
                        <span title={currentProof.stellarHash}>{shorten(currentProof.stellarHash)}</span>
                    </MetaRow>
                    <MetaRow label="Wallet">
                        <span title={currentProof.wallet}>{shorten(currentProof.wallet)}</span>
                    </MetaRow>
                    <MetaRow label="Transaction">
                        <a
                            className={LINK_CLASSES}
                            href={explorerTxUrl(currentProof.txHash)}
                            target="_blank"
                            rel="noreferrer"
                            title={explorerTxUrl(currentProof.txHash)}
                        >
                            {shorten(currentProof.txHash)}{' '}
                            <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                        </a>
                    </MetaRow>
                    <MetaRow label="Network">Stellar Testnet</MetaRow>
                    <MetaRow label="Contract">
                        <span title={currentProof.contractId}>{shorten(currentProof.contractId)}</span>
                    </MetaRow>
                    <MetaRow label="Verified At">
                        {new Date(currentProof.createdAt).toLocaleString()}
                    </MetaRow>
                </div>

                <p className="mt-[12px] flex items-center gap-[7px] text-[11.5px] text-[#888]">
                    <i className="fa-solid fa-shield-halved text-accent"></i>
                    This exact report form is provably recorded on-chain — edits to the report will no longer match this proof.
                </p>
                <div className="mt-[10px] border-t border-white/5 pt-[10px]">
                    <VerificationStatusLine verification={verification} suppressNone />
                </div>
            </section>
        );
    }

    /* ---------- unverified / in-progress / failed ---------- */
    const phaseLabel: Record<string, string> = {
        hashing: 'Preparing verification…',
        connecting: 'Connecting wallet…',
        signing: 'Awaiting wallet signature…',
        submitting: 'Submitting to Stellar…',
        confirming: 'Confirming on Testnet…',
    };
    const inFlight = busy ? (phaseLabel[att.phase] ?? 'Working…') : null;

    return (
        <section className={PANEL_CLASSES}>
            <div className="mb-[12px] flex flex-wrap items-center justify-between gap-[10px]">
                <h4 className="flex items-center gap-[9px] text-[13.5px] font-semibold">
                    <i className="fa-solid fa-cubes text-[12px] text-accent"></i>
                    Stellar Attestation
                </h4>
                {!inFlight ? (
                    <span className={`${CHIP_CLASSES} border border-white/10 bg-white/[.04] text-[#999]`}>
                        Not verified
                    </span>
                ) : (
                    <span className={`${CHIP_CLASSES} border border-[#ffb03a]/30 bg-[#ffb03a]/10 text-[#ffb03a]`}>
                        <i className="fa-solid fa-spinner fa-spin text-[10px]"></i> {inFlight}
                    </span>
                )}
            </div>

            {inFlight ? (
                <p className="text-[12.5px] leading-relaxed text-[#999]">
                    Follow the prompts in your Freighter extension. Keep this tab open until the
                    transaction is confirmed.
                </p>
            ) : (
                <>
                    <VerificationStatusLine verification={verification} />
                    {wallet.address ? (
                        <p className="mb-[10px] flex items-center gap-[7px] text-[11.5px] text-[#888]">
                            <i className="fa-solid fa-wallet text-accent"></i>
                            Connected wallet: <span title={wallet.address}>{shorten(wallet.address)}</span>
                            {message ? (
                                <button
                                    type="button"
                                    className={`${LINK_CLASSES} cursor-pointer`}
                                    onClick={() => void refresh()}
                                >
                                    · refresh
                                </button>
                            ) : null}
                        </p>
                    ) : null}
                    <p className="mb-[14px] max-w-[560px] text-[12.5px] leading-relaxed text-[#999]">
                        Record an unforgeable, timestamped fingerprint of this exact report on the
                        Stellar Testnet. Anyone can later check that the report has not been altered.
                    </p>

                    {att.error ? (
                        <p className="mb-[12px] flex items-start gap-[8px] rounded-[10px] border border-[rgba(255,45,85,.3)] bg-[rgba(255,45,85,.08)] p-[10px_12px] text-[12px] leading-snug text-[#ff7a94]">
                            <i className="fa-solid fa-triangle-exclamation mt-[2px] text-[11px]"></i>
                            Verification failed — {att.error}
                            {saveError ? ` · ${saveError}` : ''}
                        </p>
                    ) : null}
                    {!att.error && saveError ? (
                        <p className="mb-[12px] rounded-[10px] border border-[#ffb03a]/25 bg-[#ffb03a]/10 p-[10px_12px] text-[12px] leading-snug text-[#ffb03a]">
                            On-chain proof confirmed, but saving its details failed: {saveError}
                        </p>
                    ) : null}

                    <button
                        type="button"
                        onClick={() => void handleVerify()}
                        disabled={!message || loaded === false}
                        className="flex w-auto cursor-pointer items-center gap-2 rounded-[14px] border-none bg-gradient-to-r from-primary to-accent p-[12px_22px] text-[13.5px] font-semibold text-white shadow-[0_10px_30px_rgba(var(--accent-glow),.3)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(var(--accent-glow),.42)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <i className="fa-solid fa-cubes text-[12px]"></i>
                        Verify on Stellar
                    </button>
                </>
            )}
        </section>
    );
}