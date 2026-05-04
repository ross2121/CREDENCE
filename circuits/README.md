# AXIOM Credit Tier Circuit

`credit_score.circom` proves that a private `credit_score` meets a public tier threshold while exposing only:

- `tier_threshold`
- `wallet_commitment`
- `model_commitment`

Wallet/model bindings use Poseidon commitments over private secrets, private salts, and domain separators. This prevents the public inputs from directly revealing the private wallet/model material.

Expected public inputs map directly to the Anchor verifier stub:

```text
[tier_threshold, wallet_commitment, model_commitment]
```
