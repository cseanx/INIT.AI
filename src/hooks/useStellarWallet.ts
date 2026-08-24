/* ==========================
   useStellarWallet
   React state for the Freighter wallet session: connect, disconnect,
   current address. Session continuity via localStorage; the actual
   signature authority is always the extension.
========================== */

import { useCallback, useEffect, useState } from 'react';
import { STELLAR_ENABLED } from '../services/stellar/client';
import {
    connect as walletConnect,
    disconnect as walletDisconnect,
    getStoredAddress,
} from '../services/stellar/wallet';
import type { StellarWalletState } from '../types/stellar';

export interface UseStellarWallet extends StellarWalletState {
    /** Whether this deployment has Stellar enabled at all. */
    enabled: boolean;
    error: string | null;
    connect: () => Promise<string | null>;
    disconnect: () => void;
}

export function useStellarWallet(): UseStellarWallet {
    const [address, setAddress] = useState<string | null>(() => getStoredAddress());
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Re-validate a remembered address on mount (extension may have been
    // locked/removed since). Failures just clear the stored session quietly.
    useEffect(() => {
        if (!STELLAR_ENABLED || !getStoredAddress()) return;
        let active = true;
        void (async () => {
            try {
                const { fetchAddress } = await import('../services/stellar/wallet');
                const fresh = await fetchAddress();
                if (active && fresh) setAddress(fresh);
            } catch {
                if (active) setAddress(null);
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    const connect = useCallback(async (): Promise<string | null> => {
        if (!STELLAR_ENABLED) return null;
        setConnecting(true);
        setError(null);
        try {
            const addr = await walletConnect();
            setAddress(addr);
            return addr;
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            return null;
        } finally {
            setConnecting(false);
        }
    }, []);

    const disconnect = useCallback((): void => {
        void walletDisconnect();
        setAddress(null);
        setError(null);
    }, []);

    return { enabled: STELLAR_ENABLED, address, connecting, error, connect, disconnect };
}