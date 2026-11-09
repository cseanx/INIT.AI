import type { HTMLAttributes } from 'react';

/** Stat card grid used at the top of overview pages. */
export default function StatGrid({
    className = '',
    columns = 4,
    children,
    ...rest
}: HTMLAttributes<HTMLElement> & { columns?: 3 | 4 }) {
    const cols =
        columns === 3
            ? 'min-[1200px]:grid-cols-3'
            : 'min-[1200px]:grid-cols-4';
    return (
        <section
            className={`mb-4 grid w-full grid-cols-2 gap-3.5 sm:mb-5 sm:gap-5 ${cols} ${className}`}
            {...rest}
        >
            {children}
        </section>
    );
}
