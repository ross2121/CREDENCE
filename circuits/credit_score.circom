pragma circom 2.1.6;

include "circomlib/circuits/comparators.circom";

template CreditTierProof() {
    signal private input credit_score;
    signal private input wallet_secret;
    signal private input model_secret;

    signal input tier_threshold;
    signal input wallet_hash;
    signal input model_hash;

    component score_above_threshold = GreaterThan(10);
    score_above_threshold.in[0] <== credit_score;
    score_above_threshold.in[1] <== tier_threshold - 1;
    score_above_threshold.out === 1;

    // Hackathon circuit placeholder: production replaces these linear
    // commitments with Poseidon/MiMC over the wallet/model data.
    wallet_hash === wallet_secret;
    model_hash === model_secret;
}

component main { public [tier_threshold, wallet_hash, model_hash] } = CreditTierProof();
