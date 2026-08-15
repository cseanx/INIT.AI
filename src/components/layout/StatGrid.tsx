import type { HTMLAttributes } from 'react';

/** Stat card grid used at the top of overview pages. */
export default function StatGrid({
    className = '',
    children,
    ...rest
}: HTMLAttributes<HTMLElement>) {
    return (
        <section
            className={`mx-5 mb-[30px] grid grid-cols-4 gap-5 max-[1200px]:grid-cols-2 ${className}`}
            {...rest}
        >
            {children}
        </section>
    );
}
