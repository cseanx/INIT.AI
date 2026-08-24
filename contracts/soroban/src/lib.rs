//! # SpatialAttestationRegistry
//!
//! Tamper-evident attestations for INIT.AI reports on Stellar (Soroban).
//!
//! The INIT.AI frontend hashes the canonical report payload with SHA-256 and
//! calls [`attest`] through a connected wallet (e.g. Freighter). The contract
//! records ONLY:
//!   - the 32-byte report hash,
//!   - a short report reference string (the numeric report ID),
//!   - the submitting account address,
//!   - the ledger sequence + unix timestamp of the attestation.
//!
//! No satellite imagery, GeoJSON, or report bodies ever touch the chain.
//! Anyone can later call [`verify`] to prove that this exact report existed,
//! in this exact form, at that ledger time.

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, String};

/// One on-chain attestation record.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Attestation {
    /// SHA-256 of the canonical report payload.
    pub hash: BytesN<32>,
    /// INIT.AI report identifier (numeric id as a short string).
    pub report_id: String,
    /// Account that submitted the attestation.
    pub submitter: Address,
    /// Ledger sequence at attestation time.
    pub ledger_sequence: u32,
    /// Ledger timestamp (unix seconds) at attestation time.
    pub recorded_at: u64,
}

/// Storage keys.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Attestation keyed by report hash.
    Attestation(BytesN<32>),
    /// Running count of attestations.
    Total,
}

/// Persistent-storage bump: extend by ~1 year after each touch.
const EXTEND_WARM_ENTRIES: u32 = 100;
const EXTEND_TO_LEDGERS: u32 = 530_000;

/// INIT.AI's registry of spatial data attestations.
#[contract]
pub struct SpatialAttestationRegistry;

#[contractimpl]
impl SpatialAttestationRegistry {
    /// Record an attestation for `hash` on behalf of `submitter`.
    ///
    /// - Requires `submitter` to authorize the invocation (wallet signature).
    /// - Rejects duplicates — a given report hash can only ever be attested
    ///   once, keeping the proof unambiguous.
    ///
    /// Returns the stored [Attestation].
    pub fn attest(env: Env, submitter: Address, hash: BytesN<32>, report_id: String) -> Attestation {
        submitter.require_auth();

        let key = DataKey::Attestation(hash.clone());
        if env.storage().persistent().has(&key) {
            panic!("attestation already exists for this report hash");
        }

        let attestation = Attestation {
            hash: hash.clone(),
            report_id,
            submitter: submitter.clone(),
            ledger_sequence: env.ledger().sequence(),
            recorded_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&key, &attestation);
        env.storage()
            .persistent()
            .extend_ttl(&key, EXTEND_WARM_ENTRIES, EXTEND_TO_LEDGERS);

        let total_key = DataKey::Total;
        let total: u32 = env.storage().persistent().get(&total_key).unwrap_or(0);
        let new_total = total.saturating_add(1);
        env.storage().persistent().set(&total_key, &new_total);
        env.storage()
            .persistent()
            .extend_ttl(&total_key, EXTEND_WARM_ENTRIES, EXTEND_TO_LEDGERS);

        attestation
    }

    /// Look up an attestation by report hash.
    ///
    /// Returns `Some(Attestation)` when the exact hashed payload was
    /// previously attested, `None` otherwise. Touching an existing entry
    /// extends its storage lifetime so long-lived proofs stay readable.
    pub fn verify(env: Env, hash: BytesN<32>) -> Option<Attestation> {
        let key = DataKey::Attestation(hash);
        let attestation: Option<Attestation> = env.storage().persistent().get(&key);
        if attestation.is_some() {
            env.storage()
                .persistent()
                .extend_ttl(&key, EXTEND_WARM_ENTRIES, EXTEND_TO_LEDGERS);
        }
        attestation
    }

    /// Number of attestations recorded so far.
    pub fn total_attestations(env: Env) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::Total)
            .unwrap_or(0)
    }
}

#[cfg(any(test, feature = "testutils"))]
mod test;