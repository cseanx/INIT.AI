import { useEffect, useState } from 'react';

/** Live clock + date string, refreshed every second. */
export function useClock(): { time: string; date: string } {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return {
        time: now.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }),
        // 8 Nov 2026 — unambiguous for a Philippine audience.
        date: now.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }),
    };
}
