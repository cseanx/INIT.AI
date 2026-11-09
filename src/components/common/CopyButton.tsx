import { useEffect, useRef, useState } from 'react';

/** Copy-to-clipboard control with inline success feedback.
 *  Falls back to a hidden textarea when the async clipboard API is
 *  unavailable (older browsers / non-secure origins). */
export default function CopyButton({
    value,
    label,
    className = '',
}: {
    value: string;
    /** Accessible name, e.g. "Copy report hash". */
    label: string;
    className?: string;
}) {
    const [copied, setCopied] = useState(false);
    const timerRef = useRef<number | null>(null);

    useEffect(
        () => () => {
            if (timerRef.current) window.clearTimeout(timerRef.current);
        },
        [],
    );

    async function copy() {
        let ok = false;
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
                ok = true;
            }
        } catch {
            ok = false;
        }
        if (!ok) {
            try {
                const area = document.createElement('textarea');
                area.value = value;
                area.style.position = 'fixed';
                area.style.opacity = '0';
                document.body.appendChild(area);
                area.select();
                ok = document.execCommand('copy');
                area.remove();
            } catch {
                ok = false;
            }
        }
        if (!ok) return;
        setCopied(true);
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setCopied(false), 1600);
    }

    return (
        <button
            type="button"
            onClick={() => void copy()}
            aria-label={label}
            title={copied ? 'Copied' : label}
            className={`inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-white/10 bg-white/[.04] text-[#bbb] transition hover:bg-white/10 hover:text-white ${className}`}
        >
            <i
                className={`fa-solid ${copied ? 'fa-check text-mint' : 'fa-copy'} text-[12px]`}
                aria-hidden="true"
            ></i>
        </button>
    );
}
