import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { STELLAR_ENABLED } from '../services/stellar/client';
import { useStellarNetwork } from '../services/stellar/NetworkContext';
import { useStellarWallet } from '../hooks/useStellarWallet';
import Page from '../components/layout/Page';
import PanelHead from '../components/common/PanelHead';
import Card from '../components/common/Card';
import ReportsTable from '../components/reports/ReportsTable';
import ReportsFilterRail, {
    type ReportCounts,
    type ReportStatusFilter,
    type ReportVerificationFilter,
} from '../components/reports/ReportsFilterRail';
import ReportsPagination from '../components/reports/ReportsPagination';
import VerifyReportModal from '../components/reports/VerifyReportModal';
import { reportScope } from '../utils/reportScope';
import type { Report } from '../types';

const NEW_REPORT_BTN_CLASSES =
    'flex min-h-[42px] w-auto cursor-pointer items-center gap-2 rounded-[14px] border-none bg-gradient-to-r from-primary to-accent p-[11px_20px] text-[13px] font-semibold text-white shadow-[0_10px_30px_rgba(var(--accent-glow),.3)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(var(--accent-glow),.42)]';

/** Reports shown per page in the Generated Reports table. */
const PAGE_SIZE = 5;

/** Free-text match across the fields a report shows in the table. */
function matchesSearch(report: Report, term: string): boolean {
    if (!term) return true;
    return [
        report.title,
        report.type,
        report.preparedBy,
        report.city,
        report.coverage,
        report.area,
        reportScope(report),
        report.date,
        report.status,
        ...(report.datasets ?? []),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
}

export default function Reports() {
    const navigate = useNavigate();
    const { network, config } = useStellarNetwork();
    const [reports, setReports] = useState<Report[] | null>(null);
    const [search, setSearch] = useState('');
    const [verification, setVerification] = useState<ReportVerificationFilter>('all');
    const [status, setStatus] = useState<ReportStatusFilter>('all');
    const [page, setPage] = useState(1);
    const wallet = useStellarWallet();
    /** Report targeted by the "Verify on Stellar" action (modal is open while set). */
    const [verifyTarget, setVerifyTarget] = useState<Report | null>(null);

    const load = useCallback(async () => {
        const baseReports = await api.getReports(network);
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
                            api.reports.listAttestations(r.id, network),
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
    }, [network]);

    useEffect(() => {
        load();
    }, [load]);

    // The page stays mounted when navigating to the editor; refetch whenever
    // it becomes visible again so creates/edits/deletes are reflected.
    useEffect(() => {
        window.addEventListener('page-visible', load);
        return () => window.removeEventListener('page-visible', load);
    }, [load]);

    const counts: ReportCounts = useMemo(() => {
        const list = reports ?? [];
        const verified = list.filter((r) => r.attestedCurrent).length;
        const outdated = list.filter(
            (r) => !r.attestedCurrent && (r.attestationCount ?? 0) > 0,
        ).length;
        return {
            all: list.length,
            verified,
            outdated,
            unverified: list.length - verified - outdated,
            ready: list.filter((r) => r.status === 'ready').length,
            processing: list.filter((r) => r.status === 'processing').length,
        };
    }, [reports]);

    const filtered = useMemo(() => {
        let list = reports ?? [];
        const term = search.trim().toLowerCase();
        if (term) list = list.filter((r) => matchesSearch(r, term));
        if (verification === 'verified') list = list.filter((r) => r.attestedCurrent);
        else if (verification === 'outdated')
            list = list.filter((r) => !r.attestedCurrent && (r.attestationCount ?? 0) > 0);
        else if (verification === 'unverified')
            list = list.filter((r) => (r.attestationCount ?? 0) === 0);
        if (status !== 'all') list = list.filter((r) => r.status === status);
        return list;
    }, [reports, search, verification, status]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    // A narrower filter result can strand the page past the last one.
    const currentPage = Math.min(page, pageCount);
    const paged = useMemo(
        () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
        [filtered, currentPage],
    );

    // New searches and filters always read from the first page.
    useEffect(() => {
        setPage(1);
    }, [search, verification, status]);

    const hasActiveFilters =
        search.trim() !== '' || verification !== 'all' || status !== 'all';
    const resetFilters = useCallback(() => {
        setSearch('');
        setVerification('all');
        setStatus('all');
    }, []);

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

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-7">
                    <aside
                        aria-label="Report filters"
                        className="order-1 border-b border-white/8 pb-5 lg:order-none lg:col-start-2 lg:row-start-1 lg:border-b-0 lg:border-l lg:pb-0 lg:pl-7"
                    >
                        <ReportsFilterRail
                            search={search}
                            onSearchChange={setSearch}
                            verification={verification}
                            onVerificationChange={setVerification}
                            status={status}
                            onStatusChange={setStatus}
                            counts={counts}
                            networkLabel={config.label}
                            onReset={hasActiveFilters ? resetFilters : undefined}
                        />
                    </aside>

                    <div className="order-2 min-w-0 lg:order-none lg:col-start-1 lg:row-start-1">
                        {reports ? (
                            <>
                                <ReportsTable
                                    reports={paged}
                                    onVerify={STELLAR_ENABLED ? setVerifyTarget : undefined}
                                    onReset={hasActiveFilters ? resetFilters : undefined}
                                />
                                <ReportsPagination
                                    page={currentPage}
                                    pageCount={pageCount}
                                    total={filtered.length}
                                    pageSize={PAGE_SIZE}
                                    onPageChange={setPage}
                                />
                            </>
                        ) : null}
                    </div>
                </div>
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
