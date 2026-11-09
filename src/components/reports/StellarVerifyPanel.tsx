import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api } from '../../services/api';
import { CONTRACT_ID, STELLAR_ENABLED } from '../../services/stellar/client';
import { explorerTxUrl } from '../../types/stellar';
import type { AttestationMessage, ReportAttestationRecord } from '../../types/stellar';
import { useStellarAttestation } from '../../hooks/useStellarAttestation';
import { useStellarWallet } from '../../hooks/useStellarWallet';
import { useStellarVerification } from '../../hooks/useStellarVerification';
import CopyButton from '../common/CopyButton';
import type { Report } from '../../types';

const PANEL_CLASSES =
    'rounded-[18px] border border-white/8 bg-white/[.03] p-[18px] sm:p-[22px]';
const CHIP_CLASSES =
    'inline-flex items-center gap-[6px] rounded-full px-[10px] py-[4px] text-[12px] font-semibold';
const LABEL_CLASSES =
    'block text-[12px] font-medium uppercase tracking-[.06em] text-[#999]';
const MONO_VALUE_CLASSES =
    'mt-1 block break-all font-mono text-[12.5px] leading-relaxed text-white';
const LINK_CLASSES = 'text-accent hover:text-white hover:underline';

function explorerAccountUrl(address: string): string {
    return `https://stellar.expert/explorer/testnet/account/${address}`;
}

function explorerContractUrl(contractId: string): string {
    return `https://stellar.expert/explorer/testnet/contract/${contractId}`;
}

/** Plain-language chain status, straight from the Soroban contract. */
function VerificationStatusLine({
    verification,
    context = 'unverified',
}: {
    verification: ReturnType<typeof useStellarVerification>;
    /** "verified" keeps the wording additive instead of casting doubt on the
     *  database proof above it. */
    context?: 'verified' | 'unverified';
}) {
    const { outcome, recheck } = verification;
    if (outcome === 'unchecked' || outcome === 'checking') {
        return (
            <p className="flex items-center gap-[7px] text-[12px] text-[#aaa]">
                <i className="fa-solid fa-spinner fa-spin text-accent" aria-hidden="true"></i>
                {context === 'verified'
                    ? 'Re-checking the contract independently…'
                    : 'Checking the Stellar network…'}
            </p>
        );
    }
    if (outcome === 'valid') {
        return (
            <p className="flex items-start gap-[7px] text-[12px] leading-relaxed text-mint">
                <i className="fa-solid fa-circle-check mt-[2px]" aria-hidden="true"></i>
                Independently confirmed against the Soroban contract.
            </p>
        );
    }
    if (outcome === 'none') {
        if (context === 'verified') return null;
        return (
            <p className="flex items-start gap-[7px] text-[12px] leading-relaxed text-[#aaa]">
                <i className="fa-solid fa-circle-info mt-[2px] text-accent" aria-hidden="true"></i>
                This report version has not been recorded on Stellar yet.
            </p>
        );
    }
    return (
        <p className="flex flex-wrap items-center gap-[7px] rounded-[10px] border border-[#ffb03a]/25 bg-[#ffb03a]/10 p-[8px_12px] text-[12px] leading-relaxed text-[#ffb03a]">
            <i className="fa-solid fa-wifi" aria-hidden="true"></i>
            The contract readback could not answer just now.
            <button
                type="button"
                onClick={recheck}
                className={`${LINK_CLASSES} cursor-pointer font-semibold`}
            >
                Try again
            </button>
        </p>
    );
}

/** Label + full value + copy control. Nothing in the proof is truncated. */
function ProofField({
    label,
    value,
    copyLabel,
    href,
    children,
}: {
    label: string;
    value?: string;
    copyLabel?: string;
    href?: string;
    children?: ReactNode;
}) {
    return (
        <div className="min-w-0">
            <span className={LABEL_CLASSES}>{label}</span>
            <div className="mt-1 flex items-start gap-2">
                <div className="min-w-0 flex-1">
                    {children ?? (
                        <span className={MONO_VALUE_CLASSES}>{value}</span>
                    )}
                    {href && value ? (
                        <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className={`mt-1 inline-flex items-center gap-1 text-[12px] font-semibold ${LINK_CLASSES}`}
                        >
                            Open in Stellar Expert
                            <i className="fa-solid fa-arrow-up-right-from-square text-[11px]" aria-hidden="true"></i>
                        </a>
                    ) : null}
                </div>
                {value && copyLabel ? (
                    <CopyButton value={value} label={copyLabel} className="mt-0.5" />
                ) : null}
            </div>
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

    const confirmed = records
        .filter((r) => r.status === 'confirmed')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const revision = currentProof
        ? confirmed.findIndex((r) => r.id === currentProof.id) + 1
        : 0;

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
            <section className={PANEL_CLASSES} aria-label="Stellar attestation proof">
                <div className="mb-[16px] flex flex-wrap items-center justify-between gap-[10px]">
                    <div className="flex flex-wrap items-center gap-2">
                        <h4 className="flex items-center gap-[9px] text-[14px] font-semibold">
                            <i className="fa-solid fa-circle-check text-[14px] text-mint" aria-hidden="true"></i>
                            Verified on Stellar
                        </h4>
                        <span className={`${CHIP_CLASSES} border border-mint/30 bg-mint/10 text-mint`}>
                            <i className="fa-solid fa-link text-[11.5px]" aria-hidden="true"></i> Testnet
                        </span>
                        {revision > 0 ? (
                            <span className={`${CHIP_CLASSES} border border-white/10 bg-white/[.04] text-[#ccc]`}>
                                Revision {revision} of {confirmed.length}
                            </span>
                        ) : null}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <ProofField
                            label="Report hash · SHA-256"
                            value={currentProof.stellarHash}
                            copyLabel="Copy report hash"
                        />
                    </div>
                    <ProofField
                        label="Transaction"
                        value={currentProof.txHash}
                        copyLabel="Copy transaction hash"
                        href={explorerTxUrl(currentProof.txHash)}
                    />
                    <ProofField
                        label="Submitting wallet"
                        value={currentProof.wallet}
                        copyLabel="Copy wallet address"
                        href={explorerAccountUrl(currentProof.wallet)}
                    />
                    <ProofField
                        label="Contract"
                        value={currentProof.contractId}
                        copyLabel="Copy contract ID"
                        href={explorerContractUrl(currentProof.contractId)}
                    />
                    <ProofField label="Network">
                        <span className="mt-1 block text-[13px] font-medium text-white">
                            Stellar Testnet
                        </span>
                    </ProofField>
                    <ProofField label="Recorded at">
                        <span className="mt-1 block text-[13px] text-white">
                            {new Date(currentProof.createdAt).toLocaleString()}
                        </span>
                    </ProofField>
                    <ProofField
                        label={currentProof.prevHash ? 'Previous digest' : 'Revision chain'}
                        value={currentProof.prevHash ?? undefined}
                        copyLabel={currentProof.prevHash ? 'Copy previous digest' : undefined}
                    >
                        {currentProof.prevHash ? undefined : (
                            <span className="mt-1 block text-[13px] text-[#bbb]">
                                First recorded version for this report.
                            </span>
                        )}
                    </ProofField>
                </div>

                <p className="mt-[14px] border-t border-white/6 pt-[12px] text-[12px] leading-relaxed text-[#aaa]">
                    <i className="fa-solid fa-shield-halved mr-[6px] text-accent" aria-hidden="true"></i>
                    On-chain: the digest, wallet, and ledger time. Report content, place names, and
                    coordinates stay in INIT.AI. Editing the report makes this proof stale.
                </p>
                <div className="mt-[10px]">
                    <VerificationStatusLine verification={verification} context="verified" />
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
        <section className={PANEL_CLASSES} aria-label="Stellar attestation">
            <div className="mb-[12px] flex flex-wrap items-center justify-between gap-[10px]">
                <h4 className="flex items-center gap-[9px] text-[14px] font-semibold">
                    <i className="fa-solid fa-cubes text-[13px] text-accent" aria-hidden="true"></i>
                    Stellar attestation
                </h4>
                {!inFlight ? (
                    <span className={`${CHIP_CLASSES} border border-white/10 bg-white/[.04] text-[#bbb]`}>
                        Not verified yet
                    </span>
                ) : (
                    <span className={`${CHIP_CLASSES} border border-[#ffb03a]/30 bg-[#ffb03a]/10 text-[#ffb03a]`}>
                        <i className="fa-solid fa-spinner fa-spin text-[11.5px]" aria-hidden="true"></i>{' '}
                        {inFlight}
                    </span>
                )}
            </div>

            {inFlight ? (
                <p className="text-[12.5px] leading-relaxed text-[#bbb]">
                    Follow the prompts in your Freighter extension. Keep this tab open until the
                    transaction is confirmed.
                </p>
            ) : (
                <>
                    <VerificationStatusLine verification={verification} />
                    <div className="mt-[14px] grid grid-cols-1 gap-x-6 gap-y-4 border-t border-white/6 pt-[14px] sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <ProofField
                                label="Digest to attest · SHA-256"
                                value={message?.hash}
                                copyLabel="Copy digest to attest"
                            >
                                {message?.hash ? undefined : (
                                    <span className="mt-1 block text-[12.5px] text-[#999]">
                                        {loaded ? 'Digest unavailable — reload the report.' : 'Loading digest…'}
                                    </span>
                                )}
                            </ProofField>
                        </div>
                        <ProofField label="Network">
                            <span className="mt-1 block text-[13px] font-medium text-white">
                                Stellar Testnet
                            </span>
                        </ProofField>
                        <ProofField
                            label="Contract"
                            value={CONTRACT_ID}
                            copyLabel="Copy contract ID"
                            href={explorerContractUrl(CONTRACT_ID)}
                        />
                    </div>
                    {wallet.address ? (
                        <p className="mt-[12px] flex flex-wrap items-center gap-[7px] text-[12px] text-[#aaa]">
                            <i className="fa-solid fa-wallet text-accent" aria-hidden="true"></i>
                            Connected wallet:
                            <span className="break-all font-mono">{wallet.address}</span>
                            {message ? (
                                <button
                                    type="button"
                                    className={`${LINK_CLASSES} cursor-pointer font-semibold`}
                                    onClick={() => void refresh()}
                                >
                                    Refresh
                                </button>
                            ) : null}
                        </p>
                    ) : null}
                    <p className="mb-[14px] mt-[10px] max-w-[640px] text-[12.5px] leading-relaxed text-[#bbb]">
                        Record a timestamped SHA-256 fingerprint of this exact report on Stellar
                        Testnet. Anyone can later check that the report has not been altered; the
                        chain proves existence, not the science.
                    </p>

                    {att.error ? (
                        <p className="mb-[12px] flex items-start gap-[8px] rounded-[10px] border border-[rgba(255,45,85,.3)] bg-[rgba(255,45,85,.08)] p-[10px_12px] text-[12px] leading-snug text-[#ff7a94]">
                            <i className="fa-solid fa-triangle-exclamation mt-[2px] text-[12px]" aria-hidden="true"></i>
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
                        className="flex min-h-[44px] w-auto cursor-pointer items-center gap-2 rounded-[14px] border-none bg-gradient-to-r from-primary to-accent p-[12px_22px] text-[13.5px] font-semibold text-white shadow-[0_10px_30px_rgba(var(--accent-glow),.3)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(var(--accent-glow),.42)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <i className="fa-solid fa-cubes text-[12px]" aria-hidden="true"></i>
                        Verify on Stellar
                    </button>
                </>
            )}
        </section>
    );
}
