pragma circom 2.1.6;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

template CreditTierProof() {
    signal input credit_score;
    signal input wallet_secret;
    signal input wallet_salt;
    signal input model_secret;
    signal input model_salt;

    signal input tier_threshold;
    signal input wallet_commitment;
    signal input model_commitment;

    component score_above_threshold = GreaterThan(10);
    score_above_threshold.in[0] <== credit_score;
    score_above_threshold.in[1] <== tier_threshold - 1;
    score_above_threshold.out === 1;

    component wallet_poseidon = Poseidon(3);
    wallet_poseidon.inputs[0] <== wallet_secret;
    wallet_poseidon.inputs[1] <== wallet_salt;
    wallet_poseidon.inputs[2] <== 1001;
    wallet_poseidon.out === wallet_commitment;

    component model_poseidon = Poseidon(3);
    model_poseidon.inputs[0] <== model_secret;
    model_poseidon.inputs[1] <== model_salt;
    model_poseidon.inputs[2] <== 2001;
    model_poseidon.out === model_commitment;
}

component main { public [tier_threshold, wallet_commitment, model_commitment] } = CreditTierProof();
