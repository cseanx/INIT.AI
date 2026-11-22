/** Page buttons shown around the current page. Always includes first and
 *  last; a 'gap' marker replaces the runs between them and the window. */
function pageItems(current: number, count: number): Array<number | 'gap'> {
    if (count <= 7) {
        return Array.from({ length: count }, (_, i) => i + 1);
    }
    const inner = Array.from(new Set([current - 1, current, current + 1]))
        .filter((p) => p > 1 && p < count)
        .sort((a, b) => a - b);
    const items: Array<number | 'gap'> = [1];
    let previous = 1;
    for (const p of inner) {
        if (p - previous > 1) items.push('gap');
        items.push(p);
        previous = p;
    }
    if (count - previous > 1) items.push('gap');
    items.push(count);
    return items;
}

const PAGE_BTN_CLASSES =
    'inline-flex h-[38px] min-w-[38px] cursor-pointer select-none items-center justify-center rounded-[10px] border text-[13px] font-semibold tabular-nums transition duration-200';
const PAGE_ACTIVE_CLASSES =
    'border-[rgba(var(--accent-glow),.45)] bg-[rgba(var(--accent-glow),.18)] text-white';
const PAGE_IDLE_CLASSES =
    'border-white/10 bg-white/[.04] text-[#bbb] hover:bg-white/8 hover:text-white';
const PAGE_ARROW_CLASSES = `${PAGE_IDLE_CLASSES} disabled:cursor-not-allowed disabled:opacity-40`;

export default function ReportsPagination({
    page,
    pageCount,
    total,
    pageSize,
    onPageChange,
}: {
    /** 1-based current page. */
    page: number;
    pageCount: number;
    /** Total reports after filtering. */
    total: number;
    pageSize: number;
    onPageChange: (page: number) => void;
}) {
    if (total === 0) return null;

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    return (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/6 pt-4">
            <p className="text-[12px] tabular-nums text-[#999]" aria-live="polite">
                Showing {from}–{to} of {total} {total === 1 ? 'report' : 'reports'}
            </p>
            {pageCount > 1 ? (
                <nav aria-label="Reports pages" className="flex items-center gap-[6px]">
                    <button
                        type="button"
                        className={`${PAGE_BTN_CLASSES} ${PAGE_ARROW_CLASSES} h-[38px] w-[38px] min-w-0 px-0`}
                        disabled={page <= 1}
                        onClick={() => onPageChange(page - 1)}
                        aria-label="Previous page"
                    >
                        <i className="fa-solid fa-chevron-left text-[11.5px]" aria-hidden="true"></i>
                    </button>
                    {pageItems(page, pageCount).map((item, index) =>
                        item === 'gap' ? (
                            <span
                                key={`gap-${index}`}
                                aria-hidden="true"
                                className="px-[2px] text-[13px] text-[#888]"
                            >
                                …
                            </span>
                        ) : (
                            <button
                                key={item}
                                type="button"
                                onClick={() => onPageChange(item)}
                                aria-current={item === page ? 'page' : undefined}
                                aria-label={`Page ${item}`}
                                className={`${PAGE_BTN_CLASSES} ${
                                    item === page ? PAGE_ACTIVE_CLASSES : PAGE_IDLE_CLASSES
                                } px-[6px]`}
                            >
                                {item}
                            </button>
                        ),
                    )}
                    <button
                        type="button"
                        className={`${PAGE_BTN_CLASSES} ${PAGE_ARROW_CLASSES} h-[38px] w-[38px] min-w-0 px-0`}
                        disabled={page >= pageCount}
                        onClick={() => onPageChange(page + 1)}
                        aria-label="Next page"
                    >
                        <i className="fa-solid fa-chevron-right text-[11.5px]" aria-hidden="true"></i>
                    </button>
                </nav>
            ) : null}
        </div>
    );
}
