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

    let attestation = client.attest(&submitter, &hash, &report_id);

    assert_eq!(attestation.hash, hash);
    assert_eq!(attestation.report_id, report_id);
    assert_eq!(attestation.submitter, submitter);
    assert_eq!(attestation.ledger_sequence, 9_000);
    assert_eq!(attestation.recorded_at, 1_787_000_000);

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

    client.attest(&submitter, &hash, &String::from_str(&env, "7"));
    client.attest(&submitter, &hash, &String::from_str(&env, "7"));
}

#[test]
fn different_hashes_are_independent() {
    let env = Env::default();
    let contract_id = env.register(SpatialAttestationRegistry, ());
    let client = SpatialAttestationRegistryClient::new(&env, &contract_id);
    env.mock_all_auths();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.attest(&alice, &sample_hash(&env, 3), &String::from_str(&env, "1"));
    client.attest(&bob, &sample_hash(&env, 4), &String::from_str(&env, "2"));

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
        client
            .attest(&submitter, &sample_hash(&env, 5), &String::from_str(&env, "8"));
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
            args: (submitter.clone(), hash.clone(), report_id.clone()).into_val(&env),
            sub_invokes: &[],
        },
    }]);

    let client = SpatialAttestationRegistryClient::new(&env, &contract_id);
    let attestation = client.attest(&submitter, &hash, &report_id);
    assert_eq!(attestation.submitter, submitter);
    assert_eq!(client.total_attestations(), 1);
}