import { useMemo } from 'react';

interface Particle {
    size: number;
    left: number;
    duration: number;
    delay: number;
}

const PARTICLE_COUNT = 45;

function makeParticles(): Particle[] {
    return Array.from({ length: PARTICLE_COUNT }, () => ({
        size: Math.random() * 4 + 2,
        left: Math.random() * 100,
        duration: 8 + Math.random() * 8,
        delay: Math.random() * -10,
    }));
}

/** Floating background particles for the login screen. */
export default function Particles() {
    const particles = useMemo(makeParticles, []);

    return (
        <div id="particles">
            {particles.map((p, i) => (
                <div
                    key={i}
                    className="particle"
                    style={{
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        left: `${p.left}%`,
                        animationDuration: `${p.duration}s`,
                        animationDelay: `${p.delay}s`,
                    }}
                />
            ))}
        </div>
    );
}
