/* ==========================
   STELLAR WALLET (Freighter via StellarWalletsKit)
   Connect / disconnect / address / network awareness / transaction signing.
   This is NOT a second auth system — the app's session still comes from the
   FastAPI cookie; the wallet only signs Stellar transactions.
========================== */

import { NETWORK_PASSPHRASE, requireStellarEnabled } from './client';

const STORE_KEY = 'initai_stellar_address';

type Kit = typeof import('@creit.tech/stellar-wallets-kit');

let kitLoaded = false;

/** Load + initialize the kit exactly once (Freighter is the only module). */
async function getKit(): Promise<Kit> {
    requireStellarEnabled();
    const [{ Networks, StellarWalletsKit }, { FreighterModule, FREIGHTER_ID }] =
        await Promise.all([
            import('@creit.tech/stellar-wallets-kit'),
            import('@creit.tech/stellar-wallets-kit/modules/freighter'),
        ]);
    if (!kitLoaded) {
        StellarWalletsKit.init({
            modules: [new FreighterModule()],
            selectedWalletId: FREIGHTER_ID,
            // Kit-side network awareness: signatures are requested against Testnet.
            network: Networks.TESTNET,
        });
        kitLoaded = true;
    }
    return import('@creit.tech/stellar-wallets-kit');
}

/** Address remembered from a previous connection (session continuity). */
export function getStoredAddress(): string | null {
    try {
        return localStorage.getItem(STORE_KEY);
    } catch {
        return null;
    }
}

const FREIGHTER_MODULE_ID = 'freighter';

/**
 * Ask Freighter for the user's public key. The extension opens its approval
 * popup on first use; rejects if the user declines or Freighter is missing.
 */
export async function connect(): Promise<string> {
    const kit = await getKit();
    const { StellarWalletsKit } = kit;
    try {
        StellarWalletsKit.setWallet(FREIGHTER_MODULE_ID);
        const { address } = await StellarWalletsKit.getAddress();
        try {
            localStorage.setItem(STORE_KEY, address);
        } catch {
            /* private mode — session-only persistence */
        }
        return address;
    } catch (err) {
        throw normalizeWalletError(err);
    }
}

/** Clear our remembered session. (Freighter itself stays unlocked until
 *  the user locks it — a dapp cannot force that.) */
export async function disconnect(): Promise<void> {
    try {
        localStorage.removeItem(STORE_KEY);
    } catch {
        /* ignore */
    }
    if (!kitLoaded) return;
    const { StellarWalletsKit } = await getKit();
    try {
        await StellarWalletsKit.disconnect();
    } catch {
        /* already disconnected */
    }
}

/** Fetch the address straight from the extension (validates the session). */
export async function fetchAddress(): Promise<string> {
    const { StellarWalletsKit } = await getKit();
    const { address } = await StellarWalletsKit.getAddress();
    return address;
}

/** Network awareness: throws a friendly error when Freighter isn't on Testnet. */
export async function assertTestnetSelected(): Promise<void> {
    const { Networks, StellarWalletsKit } = await getKit();
    const net = await StellarWalletsKit.getNetwork().catch(() => null);
    if (net && net.networkPassphrase !== Networks.TESTNET) {
        throw new Error('Your Freighter wallet is set to the wrong network. Switch it to Testnet and try again.');
    }
}

/** Sign a prepared transaction XDR with the connected account. */
export async function signTransaction(xdr: string, address: string): Promise<string> {
    const { StellarWalletsKit } = await getKit();
    const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        address,
    });
    return signedTxXdr;
}

/* ---------- internals ---------- */

export function normalizeWalletError(err: unknown): Error {
    const raw = err instanceof Error ? err.message : String(err);
    const msg = raw.toLowerCase();
    if (msg.includes('declined') || msg.includes('rejected') || msg.includes('denied')) {
        return new Error('The signature request was declined in your wallet.');
    }
    if (msg.includes('not installed') || msg.includes('no wallet') || msg.includes('extension')) {
        return new Error('The Freighter browser extension is not installed or is locked.');
    }
    if (msg.includes('passphrase') || msg.includes('network')) {
        return new Error('Wallet network mismatch — switch Freighter to Testnet.');
    }
    return err instanceof Error ? err : new Error(raw);
}
