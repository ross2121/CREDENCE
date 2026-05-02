# AXIOM Credit Tier Circuit

`credit_score.circom` proves that a private `credit_score` meets a public tier threshold while exposing only:

- `tier_threshold`
- `wallet_hash`
- `model_hash`

For the hackathon scaffold, wallet/model hash checks are linear placeholders so fixtures can be generated deterministically without a full trusted setup. Replace those constraints with Poseidon commitments before production use.

Expected public inputs map directly to the Anchor verifier stub:

```text
[tier_threshold, wallet_hash, model_hash]
```
