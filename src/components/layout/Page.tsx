import type { HTMLAttributes } from 'react';

/** Standard page wrapper — consistent entrance animation for every route. */
export default function Page({
    className = '',
    children,
    ...rest
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={`animate-view-in ${className}`} {...rest}>
            {children}
        </div>
    );
}
