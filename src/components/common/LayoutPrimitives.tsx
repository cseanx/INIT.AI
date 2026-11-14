import type { ReactNode } from 'react';

/**
 * Layout primitives for the "fill the frame" composition system.
 *
 * Rule set (see DESIGN.md):
 *  - A card contains either a SplitPanel (visual + rail) or a LedgerList,
 *    never a lone visual floating in an oversized shell.
 *  - Cards never nest. Dense groupings use ledger rows with hairline dividers.
 */

export function SplitPanel({
    left,
    right,
    className = '',
}: {
    left: ReactNode;
    right: ReactNode;
    className?: string;
}) {
    return (
        <div className={`grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_.85fr] lg:gap-7 ${className}`}>
            <div className="min-w-0">{left}</div>
            <div className="min-w-0 lg:border-l lg:border-white/8 lg:pl-7">{right}</div>
        </div>
    );
}

export function LedgerList({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <ul className={`ledger-list flex flex-col ${className}`}>{children}</ul>;
}

export function MicroBar({
    value,
    max = 100,
    tone = 'accent',
    label,
}: {
    value: number;
    max?: number;
    tone?: 'accent' | 'mint' | 'gold' | 'orange' | 'neutral';
    label?: string;
}) {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    const toneClass =
        tone === 'mint'
            ? 'bg-mint'
            : tone === 'gold'
              ? 'bg-gold'
              : tone === 'orange'
                ? 'bg-orange'
                : tone === 'neutral'
                  ? 'bg-white/40'
                  : 'bg-gradient-to-r from-orange to-primary';
    return (
        <div className="flex items-center gap-2">
            <div className="h-[5px] min-w-0 flex-1 overflow-hidden rounded-full bg-white/8">
                <div className={`h-full rounded-full ${toneClass}`} style={{ width: `${pct}%` }} />
            </div>
            {label ? (
                <span className="shrink-0 text-[11.5px] font-semibold tabular-nums text-[#ddd]">{label}</span>
            ) : null}
        </div>
    );
}

export function LedgerRow({
    media,
    title,
    subtitle,
    meta,
    tags,
    bar,
    actions,
}: {
    media?: ReactNode;
    title: ReactNode;
    subtitle?: ReactNode;
    meta?: ReactNode;
    tags?: string[];
    bar?: { value: number; max?: number; tone?: 'accent' | 'mint' | 'gold' | 'orange' | 'neutral'; label?: string };
    actions?: ReactNode;
}) {
    return (
        <li className="ledger-row flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/6 py-3.5 last:border-b-0 sm:flex-nowrap">
            {media ? <span className="flex shrink-0 items-center">{media}</span> : null}
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <strong className="text-[13.5px] font-semibold text-white">{title}</strong>
                    {tags?.map((tag) => (
                        <span
                            key={tag}
                            className="rounded-full border border-white/10 bg-white/[.04] px-2 py-0.5 text-[11px] text-[#bbb]"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
                {subtitle ? <div className="mt-0.5 text-[12px] text-[#999]">{subtitle}</div> : null}
                {bar ? (
                    <div className="mt-2 max-w-[320px]">
                        <MicroBar value={bar.value} max={bar.max} tone={bar.tone} label={bar.label} />
                    </div>
                ) : null}
            </div>
            {meta ? <div className="shrink-0 text-right">{meta}</div> : null}
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </li>
    );
}

export function InsightStrip({ icon = 'fa-circle-info', children }: { icon?: string; children: ReactNode }) {
    return (
        <p className="mt-4 flex items-start gap-2 border-t border-white/6 pt-3 text-[12px] leading-relaxed text-[#999]">
            <i className={`fa-solid ${icon} mt-0.5 text-[11px] text-accent`}></i>
            <span>{children}</span>
        </p>
    );
}