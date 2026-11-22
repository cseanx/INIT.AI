export type ReportVerificationFilter = 'all' | 'verified' | 'outdated' | 'unverified';
export type ReportStatusFilter = 'all' | 'ready' | 'processing';

export interface ReportCounts {
    all: number;
    verified: number;
    outdated: number;
    unverified: number;
    ready: number;
    processing: number;
}

const SECTION_LABEL_CLASSES =
    'text-[11px] font-semibold uppercase tracking-[.1em] text-[#999]';
const ROW_BASE_CLASSES =
    'flex min-h-[38px] w-full cursor-pointer items-center justify-between gap-3 rounded-[10px] px-[10px] text-left text-[13px] transition duration-200';
const ROW_ACTIVE_CLASSES =
    'bg-[rgba(var(--accent-glow),.16)] text-white ring-1 ring-[rgba(var(--accent-glow),.4)]';
const ROW_IDLE_CLASSES = 'text-[#bbb] hover:bg-white/[.05] hover:text-white';

function FilterRow({
    label,
    count,
    active,
    dotClass,
    onClick,
}: {
    label: string;
    count: number;
    active: boolean;
    dotClass?: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={`${ROW_BASE_CLASSES} ${active ? ROW_ACTIVE_CLASSES : ROW_IDLE_CLASSES}`}
        >
            <span className="flex min-w-0 items-center gap-[9px]">
                {dotClass ? (
                    <span
                        className={`h-[7px] w-[7px] shrink-0 rounded-full ${dotClass}`}
                        aria-hidden="true"
                    ></span>
                ) : null}
                {label}
            </span>
            <span className="tabular-nums text-[12px] text-[#888]">{count}</span>
        </button>
    );
}

const SEARCH_INPUT_CLASSES =
    'w-full rounded-[14px] border border-white/10 bg-white/[.04] p-[10px_34px_10px_38px] text-[16px] text-white outline-none transition duration-200 placeholder:text-[#888] focus:border-primary focus:shadow-[0_0_0_3px_rgba(var(--accent-glow),.15)] sm:text-[13.5px] [&::-webkit-search-cancel-button]:hidden';

export default function ReportsFilterRail({
    search,
    onSearchChange,
    verification,
    onVerificationChange,
    status,
    onStatusChange,
    counts,
    networkLabel,
    onReset,
}: {
    search: string;
    onSearchChange: (value: string) => void;
    verification: ReportVerificationFilter;
    onVerificationChange: (value: ReportVerificationFilter) => void;
    status: ReportStatusFilter;
    onStatusChange: (value: ReportStatusFilter) => void;
    counts: ReportCounts;
    networkLabel: string;
    /** Present only while a search or filter is active — renders the reset control. */
    onReset?: () => void;
}) {
    const verificationOptions: Array<{
        value: ReportVerificationFilter;
        label: string;
        dotClass?: string;
    }> = [
        { value: 'all', label: 'All reports' },
        { value: 'verified', label: 'Verified', dotClass: 'bg-mint' },
        { value: 'outdated', label: 'Outdated proof', dotClass: 'bg-gold' },
        { value: 'unverified', label: 'Unverified', dotClass: 'bg-white/25' },
    ];

    const statusOptions: Array<{ value: ReportStatusFilter; label: string; dotClass?: string }> = [
        { value: 'all', label: 'All statuses' },
        { value: 'ready', label: 'Ready' },
        { value: 'processing', label: 'Processing', dotClass: 'bg-gold' },
    ];

    return (
        <div className="flex flex-col">
            <div className="relative">
                <i
                    className="fa-solid fa-magnifying-glass pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 text-[12px] text-[#888]"
                    aria-hidden="true"
                ></i>
                <input
                    type="search"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search title, author, scope…"
                    aria-label="Search reports"
                    className={SEARCH_INPUT_CLASSES}
                />
                {search ? (
                    <button
                        type="button"
                        onClick={() => onSearchChange('')}
                        aria-label="Clear search"
                        className="absolute right-[8px] top-1/2 flex h-[26px] w-[26px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[#bbb] transition duration-200 hover:bg-white/10 hover:text-white"
                    >
                        <i className="fa-solid fa-xmark text-[11.5px]" aria-hidden="true"></i>
                    </button>
                ) : null}
            </div>

            <div role="group" aria-label="Filter by verification state" className="mt-5">
                <p className={SECTION_LABEL_CLASSES}>Verification</p>
                <div className="mt-2 flex flex-col gap-[2px]">
                    {verificationOptions.map((option) => (
                        <FilterRow
                            key={option.value}
                            label={option.label}
                            count={counts[option.value]}
                            active={verification === option.value}
                            dotClass={option.dotClass}
                            onClick={() => onVerificationChange(option.value)}
                        />
                    ))}
                </div>
                <p className="mt-2 flex gap-2 px-[10px] text-[11.5px] leading-relaxed text-[#888]">
                    <i
                        className="fa-solid fa-shield-halved mt-[2px] shrink-0 text-[11px] text-accent"
                        aria-hidden="true"
                    ></i>
                    <span>
                        &ldquo;Verified&rdquo; means the report&apos;s current content hash matches a
                        confirmed Stellar {networkLabel} proof. Editing the report makes the proof
                        stale.
                    </span>
                </p>
            </div>

            <div role="group" aria-label="Filter by status" className="mt-4">
                <p className={SECTION_LABEL_CLASSES}>Status</p>
                <div className="mt-2 flex flex-col gap-[2px]">
                    {statusOptions.map((option) => (
                        <FilterRow
                            key={option.value}
                            label={option.label}
                            count={counts[option.value]}
                            active={status === option.value}
                            dotClass={option.dotClass}
                            onClick={() => onStatusChange(option.value)}
                        />
                    ))}
                </div>
            </div>

            {onReset ? (
                <button
                    type="button"
                    onClick={onReset}
                    className="mt-5 inline-flex min-h-[38px] w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-white/10 bg-white/[.04] text-[12.5px] font-semibold text-[#ddd] transition duration-200 hover:bg-white/9 hover:text-white"
                >
                    <i className="fa-solid fa-rotate-left text-[11.5px]" aria-hidden="true"></i>
                    Reset filters
                </button>
            ) : null}
        </div>
    );
}
