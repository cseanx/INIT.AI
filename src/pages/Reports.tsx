import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { STELLAR_ENABLED } from '../services/stellar/client';
import { useStellarWallet } from '../hooks/useStellarWallet';
import Page from '../components/layout/Page';
import PanelHead from '../components/common/PanelHead';
import Card from '../components/common/Card';
import ReportsTable from '../components/reports/ReportsTable';
import VerifyReportModal from '../components/reports/VerifyReportModal';
import type { Report } from '../types';

const NEW_REPORT_BTN_CLASSES =
    'flex min-h-[42px] w-auto cursor-pointer items-center gap-2 rounded-[14px] border-none bg-gradient-to-r from-primary to-accent p-[11px_20px] text-[13px] font-semibold text-white shadow-[0_10px_30px_rgba(var(--accent-glow),.3)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(var(--accent-glow),.42)]';

type ReportFilter = 'all' | 'attested' | 'stale';

export default function Reports() {
    const navigate = useNavigate();
    const [reports, setReports] = useState<Report[] | null>(null);
    const [filter, setFilter] = useState<ReportFilter>('all');
    const wallet = useStellarWallet();
    /** Report targeted by the "Verify on Stellar" action (modal is open while set). */
    const [verifyTarget, setVerifyTarget] = useState<Report | null>(null);

    const load = useCallback(async () => {
        const baseReports = await api.getReports();
        // The deployed Vercel backend may be on an older image that does not
        // yet serialize `attestationCount/attestedCurrent/attestedAt` in
        // `ReportOut`. Enrich on the client so the Verified pill is not stuck
        // on “Unverified” even though `GET /reports/{id}/attestation` already
        // holds the proofs (e.g. report 7 `923ab672...` and report 2 `972a6b68...`).
        try {
            const enriched = await Promise.all(
                baseReports.map(async (r) => {
                    if (typeof r.id !== 'number') return r;
                    // If the backend already supplied a summary, trust it.
                    if (typeof r.attestationCount === 'number' && typeof r.attestedCurrent === 'boolean') return r;
                    try {
                        const [msg, atts] = await Promise.all([
                            api.reports.attestationMessage(r.id),
                            api.reports.listAttestations(r.id),
                        ]);
                        const confirmed = atts.filter((a) => a.status === 'confirmed');
                        const attestedCurrent = confirmed.some((a) => a.stellarHash === msg.hash);
                        const latest = [...confirmed].sort(
                            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                        )[0];
                        return {
                            ...r,
                            attestationCount: confirmed.length,
                            attestedCurrent,
                            attestedAt: latest?.createdAt ?? r.attestedAt ?? null,
                        };
                    } catch {
                        return r;
                    }
                }),
            );
            setReports(enriched);
        } catch {
            setReports(baseReports);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // The page stays mounted when navigating to the editor; refetch whenever
    // it becomes visible again so creates/edits/deletes are reflected.
    useEffect(() => {
        window.addEventListener('page-visible', load);
        return () => window.removeEventListener('page-visible', load);
    }, [load]);

    const health = useMemo(() => {
        const list = reports ?? [];
        const attested = list.filter((r) => r.attestedCurrent).length;
        const stale = list.filter(
            (r) => !r.attestedCurrent && (r.attestationCount ?? 0) > 0,
        ).length;
        const proofs = list.reduce((sum, r) => sum + (r.attestationCount ?? 0), 0);
        const ready = list.filter((r) => r.status === 'ready').length;
        return { total: list.length, attested, stale, proofs, ready };
    }, [reports]);

    const visible = useMemo(() => {
        const list = reports ?? [];
        if (filter === 'attested') return list.filter((r) => r.attestedCurrent);
        if (filter === 'stale') {
            return list.filter((r) => !r.attestedCurrent && (r.attestationCount ?? 0) > 0);
        }
        return list;
    }, [reports, filter]);

    const cells: Array<{
        key: ReportFilter;
        label: string;
        value: number;
        note: string;
        tone?: string;
    }> = [
        { key: 'all', label: 'Reports', value: health.total, note: `${health.ready} ready to share` },
        {
            key: 'attested',
            label: 'Attested on-chain',
            value: health.attested,
            note: 'current form matches proof',
            tone: 'text-mint',
        },
        {
            key: 'stale',
            label: 'Needs re-verify',
            value: health.stale,
            note: 'edited after proof',
            tone: 'text-gold',
        },
    ];

    return (
        <Page>
            <Card>
                <PanelHead
                    title="Generated Reports"
                    actions={
                        <button className={NEW_REPORT_BTN_CLASSES} onClick={() => navigate('/reports/new')}>
                            <i className="fa-solid fa-plus"></i> New Report
                        </button>
                    }
                />

                <div className="mb-5 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-white/6 pb-5 sm:grid-cols-4">
                    {cells.map((cell) => (
                        <button
                            key={cell.key}
                            type="button"
                            aria-pressed={filter === cell.key}
                            onClick={() => setFilter(filter === cell.key ? 'all' : cell.key)}
                            className={`group min-h-[44px] cursor-pointer rounded-[10px] text-left transition ${
                                filter === cell.key
                                    ? 'bg-white/[.05] ring-1 ring-white/10'
                                    : 'hover:bg-white/[.03]'
                            } -m-2 p-2`}
                        >
                            <span className="block text-[12px] font-semibold uppercase tracking-[.06em] text-[#999]">
                                {cell.label}
                            </span>
                            <strong
                                className={`mt-1 block text-[26px] font-bold leading-none tabular-nums ${
                                    cell.key === 'stale' && health.stale === 0
                                        ? 'text-[#999]'
                                        : (cell.tone ?? 'text-white')
                                }`}
                            >
                                {cell.value}
                            </strong>
                            <span className="mt-1 block text-[12px] text-[#888]">{cell.note}</span>
                        </button>
                    ))}
                    <div className="-m-2 p-2">
                        <span className="block text-[12px] font-semibold uppercase tracking-[.06em] text-[#999]">
                            Proofs recorded
                        </span>
                        <strong className="mt-1 block text-[26px] font-bold leading-none tabular-nums">
                            {health.proofs}
                        </strong>
                        <span className="mt-1 block text-[12px] text-[#888]">
                            Testnet attestations
                        </span>
                    </div>
                </div>

                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#999]">
                    <p className="flex items-center gap-2">
                        <i className="fa-solid fa-shield-halved text-[12px] text-accent"></i>
                        “Attested” means the report&apos;s current content hash matches a confirmed
                        Stellar Testnet proof. Editing the report makes the proof stale.
                    </p>
                    {filter !== 'all' ? (
                        <button
                            type="button"
                            onClick={() => setFilter('all')}
                            className="inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/[.04] px-3 text-[12px] font-semibold text-[#ddd] hover:bg-white/9"
                        >
                            <i className="fa-solid fa-xmark text-[11.5px]"></i> Clear filter
                        </button>
                    ) : null}
                </div>

                {reports ? (
                    <ReportsTable
                        reports={visible}
                        onVerify={STELLAR_ENABLED ? setVerifyTarget : undefined}
                        onClearFilter={() => setFilter('all')}
                    />
                ) : null}
            </Card>
            <VerifyReportModal
                report={verifyTarget}
                open={verifyTarget !== null}
                onClose={() => setVerifyTarget(null)}
                walletAddress={wallet.address}
                onVerified={load}
            />
        </Page>
    );
}
