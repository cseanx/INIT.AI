import type { HTMLAttributes } from 'react';
import { useBentoFx } from './BentoCard';

const GLASS_CLASSES =
    'glass-panel glass-hover mb-4 min-w-0 rounded-[20px] border border-white/8 bg-white/5 p-[18px] backdrop-blur-2xl sm:mb-5 sm:rounded-[24px] sm:p-[22px] lg:p-[26px]';

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
