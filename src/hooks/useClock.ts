import { useEffect, useState } from 'react';

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

/** Live clock + date string, refreshed every second. */
export function useClock(): { time: string; date: string } {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return {
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()}`,
    };
}
