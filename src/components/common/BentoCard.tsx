import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { usePreferences } from '../../preferences/PreferencesContext';
import './BentoCard.css';

const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = '255, 45, 85'; // INIT.AI red
const MOBILE_BREAKPOINT = 768;

const useMobileDetection = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
};

function createParticleElement(x: number, y: number, color: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'particle';
    el.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: rgba(${color}, 1);
        box-shadow: 0 0 6px rgba(${color}, 0.6);
        pointer-events: none;
        z-index: 100;
        left: ${x}px;
        top: ${y}px;
    `;
    return el;
}

const calculateSpotlightValues = (radius: number) => ({
    proximity: radius * 0.5,
    fadeDistance: radius * 0.75,
});

function updateCardGlowProperties(
    card: HTMLElement,
    mouseX: number,
    mouseY: number,
    glow: number,
    radius: number,
) {
    const rect = card.getBoundingClientRect();
    const relativeX = ((mouseX - rect.left) / rect.width) * 100;
    const relativeY = ((mouseY - rect.top) / rect.height) * 100;

    card.style.setProperty('--glow-x', `${relativeX}%`);
    card.style.setProperty('--glow-y', `${relativeY}%`);
    card.style.setProperty('--glow-intensity', glow.toString());
    card.style.setProperty('--glow-radius', `${radius}px`);
}

export interface BentoFxOptions {
    glowColor?: string;
    particleCount?: number;
    borderGlow?: boolean;
    disableAnimations?: boolean;
}

/**
 * Stars + cursor border glow effects. Returns props to spread onto any
 * card element (ref, bento class names, glow style). The border glow is
 * driven by the BentoSection spotlight — no tilt / magnetism / click here.
 */
export function useBentoFx(options: BentoFxOptions = {}) {
    const {
        glowColor,
        particleCount = DEFAULT_PARTICLE_COUNT,
        borderGlow = true,
        disableAnimations = false,
    } = options;

    const { accentGlow } = usePreferences();
    const activeGlow = glowColor ?? accentGlow ?? DEFAULT_GLOW_COLOR;

    const ref = useRef<HTMLDivElement | null>(null);
    const particlesRef = useRef<HTMLDivElement[]>([]);
    const timeoutsRef = useRef<number[]>([]);
    const isHoveredRef = useRef(false);
    const memoizedParticles = useRef<HTMLDivElement[]>([]);
    const particlesInitialized = useRef(false);
    const isMobile = useMobileDetection();
    const shouldDisableAnimations = disableAnimations || isMobile;

    const initializeParticles = useCallback(() => {
        if (particlesInitialized.current || !ref.current) return;

        const { width, height } = ref.current.getBoundingClientRect();
        memoizedParticles.current = Array.from({ length: particleCount }, () =>
            createParticleElement(Math.random() * width, Math.random() * height, activeGlow),
        );
        particlesInitialized.current = true;
    }, [particleCount, activeGlow]);

    const clearAllParticles = useCallback(() => {
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];

        particlesRef.current.forEach((particle) => {
            gsap.to(particle, {
                scale: 0,
                opacity: 0,
                duration: 0.3,
                ease: 'back.in(1.7)',
                onComplete: () => {
                    particle.parentNode?.removeChild(particle);
                },
            });
        });
        particlesRef.current = [];
    }, []);

    const animateParticles = useCallback(() => {
        if (!ref.current || !isHoveredRef.current) return;

        if (!particlesInitialized.current) {
            initializeParticles();
        }

        memoizedParticles.current.forEach((particle, index) => {
            const timeoutId = window.setTimeout(() => {
                if (!isHoveredRef.current || !ref.current) return;

                const clone = particle.cloneNode(true) as HTMLDivElement;
                ref.current.appendChild(clone);
                particlesRef.current.push(clone);

                gsap.fromTo(
                    clone,
                    { scale: 0, opacity: 0 },
                    { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' },
                );

                gsap.to(clone, {
                    x: (Math.random() - 0.5) * 100,
                    y: (Math.random() - 0.5) * 100,
                    rotation: Math.random() * 360,
                    duration: 2 + Math.random() * 2,
                    ease: 'none',
                    repeat: -1,
                    yoyo: true,
                });

                gsap.to(clone, {
                    opacity: 0.3,
                    duration: 1.5,
                    ease: 'power2.inOut',
                    repeat: -1,
                    yoyo: true,
                });
            }, index * 100);

            timeoutsRef.current.push(timeoutId);
        });
    }, [initializeParticles]);

    useEffect(() => {
        if (shouldDisableAnimations || !ref.current) return;

        const element = ref.current;

        const handleMouseEnter = () => {
            isHoveredRef.current = true;
            animateParticles();
        };

        const handleMouseLeave = () => {
            isHoveredRef.current = false;
            clearAllParticles();
        };

            element.addEventListener('mouseenter', handleMouseEnter);
            element.addEventListener('mouseleave', handleMouseLeave);

            return () => {
                isHoveredRef.current = false;
                element.removeEventListener('mouseenter', handleMouseEnter);
                element.removeEventListener('mouseleave', handleMouseLeave);
                clearAllParticles();
            };
        }, [animateParticles, clearAllParticles, shouldDisableAnimations]);

    // Re-seed particles with the current accent color after a change.
    useEffect(() => {
        particlesInitialized.current = false;
        clearAllParticles();
    }, [activeGlow, clearAllParticles]);

    const className = `bento-card ${borderGlow ? 'bento-card--border-glow' : ''}`;
    const style = {
        '--glow-color': activeGlow,
        position: 'relative',
        overflow: 'hidden',
    } as CSSProperties;

    return { ref, className, style };
}

export interface BentoCardProps extends BentoFxOptions {
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
}

/** Convenience wrapper applying the bento effects to arbitrary content. */
export const BentoCard = ({
    children,
    className = '',
    style,
    glowColor,
    particleCount,
    borderGlow,
    disableAnimations,
}: BentoCardProps) => {
    const { ref, className: fxClassName, style: fxStyle } = useBentoFx({
        glowColor,
        particleCount,
        borderGlow,
        disableAnimations,
    });

    return (
        <div
            ref={ref}
            className={`${fxClassName} ${className}`}
            style={{ ...style, ...fxStyle } as CSSProperties}
        >
            {children}
        </div>
    );
};

interface BentoSpotlightProps {
    sectionRef: React.RefObject<HTMLDivElement | null>;
    disableAnimations?: boolean;
    spotlightRadius?: number;
    glowColor?: string;
}

const BentoSpotlight = ({
    sectionRef,
    disableAnimations = false,
    spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
    glowColor = DEFAULT_GLOW_COLOR,
}: BentoSpotlightProps) => {
    const spotlightRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (disableAnimations || !sectionRef?.current) return;

        const spotlight = document.createElement('div');
        spotlight.className = 'global-spotlight';
        spotlight.style.cssText = `
            position: fixed;
            width: 800px;
            height: 800px;
            border-radius: 50%;
            pointer-events: none;
            background: radial-gradient(circle,
                rgba(${glowColor}, 0.15) 0%,
                rgba(${glowColor}, 0.08) 15%,
                rgba(${glowColor}, 0.04) 25%,
                rgba(${glowColor}, 0.02) 40%,
                rgba(${glowColor}, 0.01) 65%,
                transparent 70%
            );
            z-index: 200;
            opacity: 0;
            transform: translate(-50%, -50%);
            mix-blend-mode: screen;
        `;
        document.body.appendChild(spotlight);
        spotlightRef.current = spotlight;

        const handleMouseMove = (e: MouseEvent) => {
            if (!spotlightRef.current || !sectionRef.current) return;

            const section = sectionRef.current.closest('.bento-section');
            const rect = section?.getBoundingClientRect();
            const mouseInside =
                rect &&
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom;

            const target = document.elementFromPoint(e.clientX, e.clientY);
            const overMedia = !!target && !!target.closest('img, .maplibregl-map');

            const cards = sectionRef.current.querySelectorAll('.bento-card');

            if (!mouseInside || overMedia) {
                gsap.to(spotlightRef.current, {
                    opacity: 0,
                    duration: 0.3,
                    ease: 'power2.out',
                });
                cards.forEach((card) => {
                    (card as HTMLElement).style.setProperty('--glow-intensity', '0');
                });
                return;
            }

            const { proximity, fadeDistance } = calculateSpotlightValues(spotlightRadius);
            let minDistance = Infinity;

            cards.forEach((card) => {
                const cardElement = card as HTMLElement;
                const cardRect = cardElement.getBoundingClientRect();
                const centerX = cardRect.left + cardRect.width / 2;
                const centerY = cardRect.top + cardRect.height / 2;
                const distance =
                    Math.hypot(e.clientX - centerX, e.clientY - centerY) -
                    Math.max(cardRect.width, cardRect.height) / 2;
                const effectiveDistance = Math.max(0, distance);

                minDistance = Math.min(minDistance, effectiveDistance);

                let glowIntensity = 0;
                if (effectiveDistance <= proximity) {
                    glowIntensity = 1;
                } else if (effectiveDistance <= fadeDistance) {
                    glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity);
                }

                updateCardGlowProperties(cardElement, e.clientX, e.clientY, glowIntensity, spotlightRadius);
            });

            gsap.to(spotlightRef.current, {
                left: e.clientX,
                top: e.clientY,
                duration: 0.1,
                ease: 'power2.out',
            });

            const targetOpacity =
                minDistance <= proximity
                    ? 0.8
                    : minDistance <= fadeDistance
                      ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.8
                      : 0;

            gsap.to(spotlightRef.current, {
                opacity: targetOpacity,
                duration: targetOpacity > 0 ? 0.2 : 0.5,
                ease: 'power2.out',
            });
        };

        const handleMouseLeave = () => {
            sectionRef.current?.querySelectorAll('.bento-card').forEach((card) => {
                (card as HTMLElement).style.setProperty('--glow-intensity', '0');
            });
            if (spotlightRef.current) {
                gsap.to(spotlightRef.current, {
                    opacity: 0,
                    duration: 0.3,
                    ease: 'power2.out',
                });
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseleave', handleMouseLeave);
            spotlightRef.current?.parentNode?.removeChild(spotlightRef.current);
        };
    }, [sectionRef, disableAnimations, spotlightRadius, glowColor]);

    return null;
};

export interface BentoSectionProps {
    children: ReactNode;
    className?: string;
    glowColor?: string;
    spotlightRadius?: number;
    enableSpotlight?: boolean;
    disableAnimations?: boolean;
}

/**
 * Wraps a group of cards: hosts the cursor spotlight that drives the
 * rounded border glow on every BentoCard / bento card inside.
 */
export const BentoSection = ({
    children,
    className = '',
    glowColor,
    spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
    enableSpotlight = true,
    disableAnimations = false,
}: BentoSectionProps) => {
    const { accentGlow } = usePreferences();
    const activeGlow = glowColor ?? accentGlow ?? DEFAULT_GLOW_COLOR;
    const sectionRef = useRef<HTMLDivElement | null>(null);
    const isMobile = useMobileDetection();
    const shouldDisableAnimations = disableAnimations || isMobile;

    return (
        <div ref={sectionRef} className={`bento-section ${className}`}>
            {enableSpotlight && (
                <BentoSpotlight
                    sectionRef={sectionRef}
                    disableAnimations={shouldDisableAnimations}
                    spotlightRadius={spotlightRadius}
                    glowColor={activeGlow}
                />
            )}
            {children}
        </div>
    );
};
