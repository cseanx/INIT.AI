import type { HTMLAttributes } from 'react';

/**
 * Two-column glass panel grid (1.6fr / 1fr), stacking below 1200px.
 * The `panel-grid` class lets the CSS layer zero out the bottom margin
 * of nested glass-panel cards.
 */
export default function PanelGrid({
    className = '',
    children,
    ...rest
}: HTMLAttributes<HTMLElement>) {
    return (
        <section
            className={`panel-grid mx-5 mb-[30px] grid grid-cols-[1.6fr_1fr] gap-5 max-[1200px]:grid-cols-1 ${className}`}
            {...rest}
        >
            {children}
        </section>
    );
}
