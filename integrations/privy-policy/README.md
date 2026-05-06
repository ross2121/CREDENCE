# AXIOM Privy Policy Integration

This package is the active devnet replacement for Ika Solana CPI.

Privy handles wallet authentication, embedded Solana wallets, delegated signing, authorization keys, and policy IDs off-chain. AXIOM still enforces the final destination and amount constraints on-chain through the existing policy instructions.

Devnet flow:

```text
QVAC agent -> Privy wallet policy/delegated signer -> AXIOM on-chain policy -> AXIOM instruction
```

The `PrivyPolicyClient` keeps Privy policy metadata (`privyPolicyId`, `privySignerId`) alongside AXIOM transaction builders. It does not call Privy APIs directly; production servers should use Privy's official SDK/API with authorization signatures before submitting the AXIOM transaction.
