/* ==========================
   StellarNetworkContext
   Exposes the runtime Testnet ↔ Mainnet selection to React so every screen
   re-renders on switch: labels, explorer links, contract id, and the
   attestation flow all follow the same active network.
========================== */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import {
    getActiveConfig,
    getActiveNetwork,
    networkAvailability,
    setActiveNetwork,
    subscribeNetwork,
    type StellarNetwork,
    type StellarNetworkConfig,
} from './network';
import { syncWalletNetwork } from './wallet';

export interface StellarNetworkContextValue {
    /** Active network. */
    network: StellarNetwork;
    /** Resolved config for the active network. */
    config: StellarNetworkConfig;
    /** Which networks can be selected in this build. */
    available: Record<StellarNetwork, boolean>;
    /** Switch networks; returns false when the target is unavailable. */
    setNetwork: (next: StellarNetwork) => boolean;
}

const StellarNetworkContext = createContext<StellarNetworkContextValue | null>(null);

export function StellarNetworkProvider({ children }: { children: ReactNode }) {
    const [network, setNetworkState] = useState<StellarNetwork>(() => getActiveNetwork());
    const available = useMemo(() => networkAvailability(), []);

    useEffect(() => subscribeNetwork(() => setNetworkState(getActiveNetwork())), []);

    const setNetwork = useCallback((next: StellarNetwork): boolean => {
        const changed = setActiveNetwork(next);
        if (changed) {
            // Point the wallet kit at the same chain so Freighter asks for the
            // right signatures without a page reload.
            void syncWalletNetwork(next);
        }
        return changed;
    }, []);

    const value = useMemo<StellarNetworkContextValue>(
        () => ({
            network,
            config: getActiveConfig(),
            available,
            setNetwork,
        }),
        [network, available, setNetwork],
    );

    return (
        <StellarNetworkContext.Provider value={value}>{children}</StellarNetworkContext.Provider>
    );
}

export function useStellarNetwork(): StellarNetworkContextValue {
    const context = useContext(StellarNetworkContext);
    if (!context) {
        throw new Error('useStellarNetwork must be used within a StellarNetworkProvider');
    }
    return context;
}
