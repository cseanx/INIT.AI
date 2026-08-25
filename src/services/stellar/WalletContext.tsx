/* ==========================
   StellarWalletContext
   Global wallet connection state so the header indicator, the report
   attestation panel, and the attestation hook all share ONE session:
   connecting from the header is recognized everywhere, and disconnecting
   updates the whole app. Wraps the existing wallet service — this is not
   a second wallet implementation.
========================== */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { STELLAR_ENABLED } from './client';
import {
    connect as walletConnect,
    disconnect as walletDisconnect,
    fetchAddress,
    getStoredAddress,
    normalizeWalletError,
} from './wallet';
import type { StellarWalletState } from '../../types/stellar';

export interface StellarWalletContextValue extends StellarWalletState {
    /** Whether this deployment has Stellar enabled at all. */
    enabled: boolean;
    /** User-friendly failure message from the last connect attempt. */
    error: string | null;
    connect: () => Promise<string | null>;
    disconnect: () => void;
}

const StellarWalletContext = createContext<StellarWalletContextValue | null>(null);

export function StellarWalletProvider({ children }: { children: ReactNode }) {
    const [address, setAddress] = useState<string | null>(() => getStoredAddress());
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Re-validate a remembered address on mount (extension may have been
    // locked/removed since). Failures clear the stored session quietly.
    useEffect(() => {
        if (!STELLAR_ENABLED || !getStoredAddress()) return;
        let active = true;
        void (async () => {
            try {
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
            const friendly = normalizeWalletError(err);
            // Friendly message goes to the UI; technical detail to the console.
            console.warn('[stellar] wallet connect failed:', err);
            setError(friendly.message);
            setAddress(null);
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

    const value = useMemo(
        () => ({
            enabled: STELLAR_ENABLED,
            address,
            connecting,
            error,
            connect,
            disconnect,
        }),
        [address, connecting, error, connect, disconnect],
    );

    return <StellarWalletContext.Provider value={value}>{children}</StellarWalletContext.Provider>;
}

export function useStellarWallet(): StellarWalletContextValue {
    const context = useContext(StellarWalletContext);
    if (!context) {
        throw new Error('useStellarWallet must be used within a StellarWalletProvider');
    }
    return context;
}