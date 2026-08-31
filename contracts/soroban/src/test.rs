//! Unit tests for SpatialAttestationRegistry (in-process Soroban test env).

#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger as _, MockAuth, MockAuthInvoke},
    Env, IntoVal, String,
};

fn sample_hash(env: &Env, seed: u8) -> BytesN<32> {
    let mut bytes = [0u8; 32];
    bytes[0] = seed;
    bytes[31] = seed.wrapping_mul(7);
    BytesN::from_array(env, &bytes)
}

#[test]
fn attest_then_verify_roundtrip() {
    let env = Env::default();
    let contract_id = env.register(SpatialAttestationRegistry, ());
    let client = SpatialAttestationRegistryClient::new(&env, &contract_id);
    env.mock_all_auths();
    env.ledger().with_mut(|li| {
        li.sequence_number = 9_000;
        li.timestamp = 1_787_000_000;
    });

    let submitter = Address::generate(&env);
    let hash = sample_hash(&env, 1);
    let report_id = String::from_str(&env, "42");

    let attestation = client.attest(&submitter, &hash, &report_id, &None);

    assert_eq!(attestation.hash, hash);
    assert_eq!(attestation.report_id, report_id);
    assert_eq!(attestation.submitter, submitter);
    assert_eq!(attestation.ledger_sequence, 9_000);
    assert_eq!(attestation.recorded_at, 1_787_000_000);
    assert_eq!(attestation.prev_hash, None);

    let verified = client.verify(&hash).expect("attestation should exist");
    assert_eq!(verified, attestation);
    assert_eq!(client.total_attestations(), 1);
}

#[test]
fn verify_unknown_hash_returns_none() {
    let env = Env::default();
    let contract_id = env.register(SpatialAttestationRegistry, ());
    let client = SpatialAttestationRegistryClient::new(&env, &contract_id);
    env.mock_all_auths();

    let missing = client.verify(&sample_hash(&env, 99));
    assert!(missing.is_none());
    assert_eq!(client.total_attestations(), 0);
}

#[test]
#[should_panic(expected = "attestation already exists for this report hash")]
fn duplicate_hash_is_rejected() {
    let env = Env::default();
    let contract_id = env.register(SpatialAttestationRegistry, ());
    let client = SpatialAttestationRegistryClient::new(&env, &contract_id);
    env.mock_all_auths();

    let submitter = Address::generate(&env);
    let hash = sample_hash(&env, 2);

    client.attest(&submitter, &hash, &String::from_str(&env, "7"), &None);
    client.attest(&submitter, &hash, &String::from_str(&env, "7"), &None);
}

#[test]
fn different_hashes_are_independent() {
    let env = Env::default();
    let contract_id = env.register(SpatialAttestationRegistry, ());
    let client = SpatialAttestationRegistryClient::new(&env, &contract_id);
    env.mock_all_auths();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.attest(&alice, &sample_hash(&env, 3), &String::from_str(&env, "1"), &None);
    client.attest(&bob, &sample_hash(&env, 4), &String::from_str(&env, "2"), &None);

    assert_eq!(client.total_attestations(), 2);
    assert!(client.verify(&sample_hash(&env, 3)).is_some());
    assert!(client.verify(&sample_hash(&env, 4)).is_some());

    // The recorded submitter is whoever signed each attestation.
    let first = client.verify(&sample_hash(&env, 3)).unwrap();
    assert_eq!(first.submitter, alice);
}

#[test]
fn attest_requires_submitter_authorization() {
    let env = Env::default();
    let contract_id = env.register(SpatialAttestationRegistry, ());
    let client = SpatialAttestationRegistryClient::new(&env, &contract_id);
    // Deliberately NO mock_all_auths — the call must demand a signature.
    let submitter = Address::generate(&env);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.attest(&submitter, &sample_hash(&env, 5), &String::from_str(&env, "8"), &None);
    }));
    assert!(result.is_err(), "attest without authorization must fail");
}

#[test]
fn attest_with_explicit_mocked_signature() {
    let env = Env::default();
    let contract_id = env.register(SpatialAttestationRegistry, ());
    let submitter = Address::generate(&env);
    let hash = sample_hash(&env, 6);
    let report_id = String::from_str(&env, "11");

    // Simulate exactly one real signature from `submitter` over `attest`.
    env.mock_auths(&[MockAuth {
        address: &submitter,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "attest",
            args: (submitter.clone(), hash.clone(), report_id.clone(), Option::<BytesN<32>>::None).into_val(&env),
            sub_invokes: &[],
        },
    }]);

    let client = SpatialAttestationRegistryClient::new(&env, &contract_id);
    let attestation = client.attest(&submitter, &hash, &report_id, &None);
    assert_eq!(attestation.submitter, submitter);
    assert_eq!(client.total_attestations(), 1);
}

// --- Revision (prev_hash) tests ---

#[test]
fn attest_revision_links_prev_hash_on_chain() {
    let env = Env::default();
    let contract_id = env.register(SpatialAttestationRegistry, ());
    let client = SpatialAttestationRegistryClient::new(&env, &contract_id);
    env.mock_all_auths();

    let submitter = Address::generate(&env);
    let report_id = String::from_str(&env, "7");
    let hash_v1 = sample_hash(&env, 10);
    let hash_v2 = sample_hash(&env, 11);
    let hash_v3 = sample_hash(&env, 12);

    // v1: first version, no prev
    let a1 = client.attest(&submitter, &hash_v1, &report_id, &None);
    assert_eq!(a1.prev_hash, None);

    // v2: revision of same report, links to v1
    let a2 = client.attest(&submitter, &hash_v2, &report_id, &Some(hash_v1.clone()));
    assert_eq!(a2.prev_hash, Some(hash_v1.clone()));
    assert_eq!(a2.report_id, report_id);

    // v3: chain continues, links to v2
    let a3 = client.attest(&submitter, &hash_v3, &report_id, &Some(hash_v2.clone()));
    assert_eq!(a3.prev_hash, Some(hash_v2.clone()));

    // Verify persists prev_hash
    let r1 = client.verify(&hash_v1).unwrap();
    let r2 = client.verify(&hash_v2).unwrap();
    let r3 = client.verify(&hash_v3).unwrap();
    assert_eq!(r1.prev_hash, None);
    assert_eq!(r2.prev_hash, Some(hash_v1));
    assert_eq!(r3.prev_hash, Some(hash_v2));
    assert_eq!(client.total_attestations(), 3);
}

#[test]
#[should_panic(expected = "prev_hash references unknown attestation")]
fn attest_revision_fails_when_prev_unknown() {
    let env = Env::default();
    let contract_id = env.register(SpatialAttestationRegistry, ());
    let client = SpatialAttestationRegistryClient::new(&env, &contract_id);
    env.mock_all_auths();

    let submitter = Address::generate(&env);
    let hash = sample_hash(&env, 20);
    let fake_prev = sample_hash(&env, 99); // never attested

    client.attest(&submitter, &hash, &String::from_str(&env, "7"), &Some(fake_prev));
}

#[test]
#[should_panic(expected = "prev_hash must reference same report_id")]
fn attest_revision_fails_when_prev_report_mismatch() {
    let env = Env::default();
    let contract_id = env.register(SpatialAttestationRegistry, ());
    let client = SpatialAttestationRegistryClient::new(&env, &contract_id);
    env.mock_all_auths();

    let submitter = Address::generate(&env);
    let hash_a = sample_hash(&env, 30);
    let hash_b = sample_hash(&env, 31);

    client.attest(&submitter, &hash_a, &String::from_str(&env, "7"), &None);
    // Try to create revision for report "8" linking to report "7"'s hash — should fail
    client.attest(&submitter, &hash_b, &String::from_str(&env, "8"), &Some(hash_a));
}

#[test]
fn attest_revision_can_be_from_different_submitter_same_report() {
    // Revisions are per-report, not per-wallet. A different wallet attesting a new
    // version of the same report should succeed as long as prev exists and report_id matches.
    let env = Env::default();
    let contract_id = env.register(SpatialAttestationRegistry, ());
    let client = SpatialAttestationRegistryClient::new(&env, &contract_id);
    env.mock_all_auths();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let report_id = String::from_str(&env, "42");
    let h1 = sample_hash(&env, 40);
    let h2 = sample_hash(&env, 41);

    client.attest(&alice, &h1, &report_id, &None);
    let a2 = client.attest(&bob, &h2, &report_id, &Some(h1.clone()));
    assert_eq!(a2.submitter, bob);
    assert_eq!(a2.prev_hash, Some(h1));
}
