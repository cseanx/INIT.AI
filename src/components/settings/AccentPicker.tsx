import { useState } from 'react';

interface AccentSwatch {
    gradient: string;
    title: string;
}

const SWATCHES: AccentSwatch[] = [
    { gradient: 'linear-gradient(135deg,#ff8c42,#ff2d55)', title: 'Sunset (default)' },
    { gradient: 'linear-gradient(135deg,#5aa9ff,#2f6f9e)', title: 'Ocean' },
    { gradient: 'linear-gradient(135deg,#00ff84,#2f6f4e)', title: 'Canopy' },
    { gradient: 'linear-gradient(135deg,#ffd23f,#ff8c42)', title: 'Amber' },
    { gradient: 'linear-gradient(135deg,#c792ea,#5aa9ff)', title: 'Violet' },
];

const SWATCH_CLASSES =
    'relative h-[38px] w-[38px] cursor-pointer rounded-full border-2 border-transparent transition duration-200 hover:-translate-y-0.5';

/** Visual-only accent color picker (prototype). */
export default function AccentPicker() {
    const [active, setActive] = useState(0);

    return (
        <div className="flex gap-[14px]">
            {SWATCHES.map((swatch, i) => (
                <button
                    key={swatch.title}
                    type="button"
                    className={`${SWATCH_CLASSES} swatch ${active === i ? 'active' : ''}`}
                    style={{ background: swatch.gradient }}
                    title={swatch.title}
                    onClick={() => setActive(i)}
                ></button>
            ))}
        </div>
    );
}
