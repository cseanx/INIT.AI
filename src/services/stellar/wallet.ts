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

/** Load + initialize the kit exactly once with the supported wallet set.
 *  Heavy modules (Trezor, Ledger, WalletConnect) are deliberately omitted. */
async function getKit(): Promise<Kit> {
    requireStellarEnabled();
    const [kit, freighter, albedo, xbull, rabet, lobstr, hana] = await Promise.all([
        import('@creit.tech/stellar-wallets-kit'),
        import('@creit.tech/stellar-wallets-kit/modules/freighter'),
        import('@creit.tech/stellar-wallets-kit/modules/albedo'),
        import('@creit.tech/stellar-wallets-kit/modules/xbull'),
        import('@creit.tech/stellar-wallets-kit/modules/rabet'),
        import('@creit.tech/stellar-wallets-kit/modules/lobstr'),
        import('@creit.tech/stellar-wallets-kit/modules/hana'),
    ]);
    if (!kitLoaded) {
        kit.StellarWalletsKit.init({
            modules: [
                new freighter.FreighterModule(),
                new albedo.AlbedoModule(),
                new xbull.xBullModule(),
                new rabet.RabetModule(),
                new lobstr.LobstrModule(),
                new hana.HanaModule(),
            ],
            // Freighter is the primary/demo wallet — highlighted in the modal.
            selectedWalletId: freighter.FREIGHTER_ID,
            // Kit-side network awareness: signatures are requested against Testnet.
            network: kit.Networks.TESTNET,
        });
        kitLoaded = true;
    }
    return kit;
}

/** Address remembered from a previous connection (session continuity). */
export function getStoredAddress(): string | null {
    try {
        return localStorage.getItem(STORE_KEY);
    } catch {
        return null;
    }
}

/**
 * Open the StellarWalletsKit selection popup. After the user picks a wallet
 * (Freighter, Albedo, xBull, Rabet, LOBSTR, Hana) the kit requests the
 * public key from that wallet and returns it.
 */
export async function connect(): Promise<string> {
    const kit = await getKit();
    const { StellarWalletsKit } = kit;
    try {
        const { address } = await StellarWalletsKit.authModal();
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


/** Kit/wallet rejections arrive as Error, string, OR plain objects
 *  ({code, message, ext}) — flatten them into one human sentence. */
export function normalizeWalletError(err: unknown): Error {
    let raw: string;
    if (err instanceof Error) raw = err.message;
    else if (typeof err === 'string') raw = err;
    else if (err && typeof err === 'object') {
        const candidate = err as { message?: unknown };
        raw =
            typeof candidate.message === 'string'
                ? candidate.message
                : (() => {
                      try {
                          return JSON.stringify(err);
                      } catch {
                          return String(err);
                      }
                  })();
    } else {
        raw = String(err);
    }

    const msg = raw.toLowerCase();
    if (
        msg.includes('declined') ||
        msg.includes('rejected') ||
        msg.includes('denied') ||
        msg.includes('cancelled') ||
        msg.includes('canceled')
    ) {
        return new Error('The signature request was declined in your wallet.');
    }
    if (
        msg.includes('not installed') ||
        msg.includes('no wallet') ||
        msg.includes('freighter') ||
        msg.includes('extension') ||
        msg.includes('unavailable') ||
        msg.includes('not available') ||
        msg.includes('locked') ||
        msg.includes('wallet not found') ||
        msg.includes('account not found') ||
        msg.includes('no address')
    ) {
        return new Error(
            'The Freighter browser extension is not installed, locked, or unavailable in this browser.',
        );
    }
    if (msg.includes('passphrase') || msg.includes('wrong network') || msg.includes('network')) {
        return new Error('Wallet network mismatch — switch Freighter to Testnet.');
    }
    return new Error(raw);
}
