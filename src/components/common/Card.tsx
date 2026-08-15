import type { HTMLAttributes } from 'react';

const GLASS_CLASSES =
    'mb-5 rounded-[24px] border border-white/8 bg-white/5 p-[26px] backdrop-blur-2xl';

/** Reusable glassmorphism panel (the app's standard card). */
export default function Card({
    className = '',
    children,
    ...rest
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={`${GLASS_CLASSES} ${className}`} {...rest}>
            {children}
        </div>
    );
}
