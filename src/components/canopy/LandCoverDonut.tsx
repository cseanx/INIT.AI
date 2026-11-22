import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { LandCoverDatum, ResolvedTheme } from '../../types';
import { ensureTextContrast } from '../../utils/chartTheme';
import { usePreferences } from '../../preferences/PreferencesContext';

/**
 * Land-cover composition as an annotated donut.
 *
 * Every slice carries a permanent leader line out to its class name and
 * share, so the composition reads at rest — the share of a class never
 * depends on hovering its arc. Replaces the Chart.js doughnut + tooltip
 * pair; the slice colors stay the semantic land-cover palette.
 */

/** Angular breathing room between slices, in degrees. */
const PAD_DEG = 1.8;
/** Vertical breathing room between stacked callouts. */
const GAP = 40;
const COMPACT_GAP = 34;
/** Average Outfit glyph width at 11.5px, for label-column sizing. */
const CHAR_W = 6.1;

interface Callout {
    key: string;
    name: string;
    value: number;
    color: string;
    valueColor: string;
    path: string;
    leader: string;
    labelX: number;
    labelY: number;
    side: 'left' | 'right';
}

interface DonutLayout {
    cx: number;
    cy: number;
    r: number;
    h: number;
    slices: Callout[];
    nameColor: string;
    leaderColor: string;
}

function polar(cx: number, cy: number, rad: number, deg: number): [number, number] {
    const t = (deg * Math.PI) / 180;
    return [cx + rad * Math.cos(t), cy + rad * Math.sin(t)];
}

const fmt = (n: number) => Math.round(n * 10) / 10;

function layoutDonut(data: LandCoverDatum[], width: number, theme: ResolvedTheme): DonutLayout {
    const cx = width / 2;
    const compact = width < 540;
    const labelGap = compact ? 24 : 34;
    const maxNameW = Math.max(60, ...data.map((d) => d.label.length * CHAR_W));
    // The ring fills the frame: it grows with the card up to a generous cap,
    // and the canvas height follows so the figure never looks like a small
    // chart adrift in a wide card.
    const r = Math.max(
        compact ? 50 : 72,
        Math.min(compact ? 92 : width > 940 ? 170 : 104, cx - maxNameW - labelGap - 26),
    );
    const h = Math.max(300, 2 * r + 70);
    const cy = h / 2;
    const rInner = r * 0.62;
    const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
    const surface = theme === 'dark' ? '#121214' : '#eef1f6';
    const nameColor = theme === 'dark' ? '#b3b3b3' : '#5a5f69';
    const leaderColor = theme === 'dark' ? 'rgba(255,255,255,.28)' : 'rgba(10,15,25,.25)';

    // Callout columns sit at a fixed offset per side; each label keeps a
    // minimum vertical gap, bending its leader when pushed off its arc's
    // natural elbow.
    const yTop = 12;
    const yBottom = h - 35;
    const gap = compact ? COMPACT_GAP : GAP;

    let cursor = -90;
    interface Draft extends Omit<Callout, 'leader'> {
        edgeX: number;
        edgeY: number;
        elbowX: number;
        elbowY: number;
    }
    const drafts: Draft[] = [];
    for (const d of data) {
        const span = Math.min((d.value / total) * 360, 359.4);
        const s0 = cursor + PAD_DEG / 2;
        const s1 = cursor + span - PAD_DEG / 2;
        cursor += span;
        const large = s1 - s0 > 180 ? 1 : 0;
        const p = (deg: number, rad: number) => polar(cx, cy, rad, deg);
        const [ox0, oy0] = p(s0, r);
        const [ox1, oy1] = p(s1, r);
        const [ix1, iy1] = p(s1, rInner);
        const [ix0, iy0] = p(s0, rInner);
        const mid = (s0 + s1) / 2;
        const [edgeX, edgeY] = p(mid, r + 1);
        const [elbowX, elbowY] = p(mid, r + 9);
        const side: 'left' | 'right' = Math.cos((mid * Math.PI) / 180) >= 0 ? 'right' : 'left';
        drafts.push({
            key: d.label,
            name: d.label,
            value: d.value,
            color: d.color,
            valueColor: ensureTextContrast(d.color, surface),
            path: `M ${fmt(ox0)} ${fmt(oy0)} A ${r} ${r} 0 ${large} 1 ${fmt(ox1)} ${fmt(oy1)} L ${fmt(ix1)} ${fmt(iy1)} A ${rInner} ${rInner} 0 ${large} 0 ${fmt(ix0)} ${fmt(iy0)} Z`,
            labelX: side === 'right' ? cx + r + labelGap : cx - r - labelGap,
            labelY: Math.min(Math.max(elbowY, yTop), yBottom),
            side,
            edgeX,
            edgeY,
            elbowX,
            elbowY,
        });
    }

    const resolveSide = (side: 'left' | 'right') => {
        const list = drafts.filter((d) => d.side === side).sort((a, b) => a.elbowY - b.elbowY);
        const ys = list.map((d) => d.labelY);
        for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + gap);
        const over = ys.length ? ys[ys.length - 1] - yBottom : 0;
        if (over > 0) {
            for (let i = ys.length - 1; i >= 0; i--) ys[i] -= over;
            ys[0] = Math.max(ys[0], yTop);
            for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + gap);
        }
        list.forEach((d, i) => {
            d.labelY = ys[i];
        });
    };
    resolveSide('left');
    resolveSide('right');

    const slices: Callout[] = drafts.map((d) => {
        const endX = d.side === 'right' ? d.labelX - 4 : d.labelX + 4;
        const leader = [
            `${fmt(d.edgeX)},${fmt(d.edgeY)}`,
            `${fmt(d.elbowX)},${fmt(d.elbowY)}`,
            `${fmt(endX)},${fmt(d.labelY)}`,
        ].join(' ');
        return {
            key: d.key,
            name: d.name,
            value: d.value,
            color: d.color,
            valueColor: d.valueColor,
            path: d.path,
            leader,
            labelX: d.labelX,
            labelY: d.labelY,
            side: d.side,
        };
    });

    return { cx, cy, r, h, slices, nameColor, leaderColor };
}

export default function LandCoverDonut({ data }: { data: LandCoverDatum[] }) {
    const { resolvedTheme } = usePreferences();
    const ref = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (el.clientWidth > 0) setWidth(el.clientWidth);
        const ro = new ResizeObserver((entries) => {
            const w = entries[0]?.contentRect.width;
            if (w && w > 0) setWidth(Math.round(w));
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const layout = useMemo(
        () => (width > 0 ? layoutDonut(data, width, resolvedTheme) : null),
        [data, width, resolvedTheme],
    );

    const aria = data.map((d) => `${d.label} ${d.value}%`).join(', ');

    return (
        <div
            ref={ref}
            role="img"
            aria-label={`Land cover composition — ${aria}`}
            className="w-full overflow-hidden"
        >
            {layout ? (
                <svg
                    className="landcover-donut block"
                    width={width}
                    height={layout.h}
                    viewBox={`0 0 ${width} ${layout.h}`}
                    aria-hidden="true"
                    focusable="false"
                >
                    <g>
                        {layout.slices.map((s) => (
                            <path key={s.key} d={s.path} fill={s.color} stroke="none" />
                        ))}
                    </g>
                    {layout.slices.map((s, i) => (
                        <g
                            key={s.key}
                            className="lc-callout"
                            style={{ animationDelay: `${240 + i * 70}ms` }}
                        >
                            <polyline
                                points={s.leader}
                                fill="none"
                                stroke={layout.leaderColor}
                                strokeWidth="1"
                                strokeLinejoin="round"
                            />
                            <text
                                x={s.labelX}
                                y={s.labelY + 6}
                                textAnchor={s.side === 'right' ? 'start' : 'end'}
                                fill={layout.nameColor}
                                fontSize="11.5"
                                fontWeight="600"
                                fontFamily="'Outfit', system-ui, sans-serif"
                            >
                                {s.name}
                            </text>
                            <text
                                x={s.labelX}
                                y={s.labelY + 23}
                                textAnchor={s.side === 'right' ? 'start' : 'end'}
                                fill={s.valueColor}
                                fontSize="14"
                                fontWeight="700"
                                fontFamily="'Outfit', system-ui, sans-serif"
                            >
                                {s.value}%
                            </text>
                        </g>
                    ))}
                </svg>
            ) : null}
        </div>
    );
}
