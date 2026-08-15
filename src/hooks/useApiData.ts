import { useEffect, useState } from 'react';

/** Fetch typed data through the API service layer. Returns null until resolved. */
export function useApiData<T>(fetcher: () => Promise<T>): T | null {
    const [data, setData] = useState<T | null>(null);

    useEffect(() => {
        let active = true;
        fetcher().then((result) => {
            if (active) setData(result);
        });
        return () => {
            active = false;
        };
    }, [fetcher]);

    return data;
}
