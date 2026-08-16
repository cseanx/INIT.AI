import type { HTMLAttributes } from 'react';
import { useBentoFx } from './BentoCard';

const GLASS_CLASSES =
    'glass-panel mb-5 min-w-0 rounded-[24px] border border-white/8 bg-white/5 p-[26px] backdrop-blur-2xl';

/** Reusable glassmorphism panel (the app's standard card) with bento effects. */
export default function Card({
    className = '',
    children,
    ...rest
}: HTMLAttributes<HTMLDivElement>) {
    const { ref, className: bentoClassName, style } = useBentoFx();

    return (
        <div
            ref={ref}
            style={style}
            className={`${GLASS_CLASSES} ${bentoClassName} ${className}`}
            {...rest}
        >
            {children}
        </div>
    );
}
