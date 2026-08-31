import { useCallback, useEffect, useState } from 'react';
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
    'flex w-auto cursor-pointer items-center gap-2 rounded-[14px] border-none bg-gradient-to-r from-primary to-accent p-[11px_20px] text-[13px] font-semibold text-white shadow-[0_10px_30px_rgba(var(--accent-glow),.3)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(var(--accent-glow),.42)]';

export default function Reports() {
    const navigate = useNavigate();
    const [reports, setReports] = useState<Report[] | null>(null);
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
                {reports ? (
                    <ReportsTable
                        reports={reports}
                        onVerify={STELLAR_ENABLED ? setVerifyTarget : undefined}
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