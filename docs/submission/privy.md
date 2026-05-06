# Privy Devnet Policy Layer

AXIOM uses Privy as the active Solana devnet wallet and policy layer. Privy provides embedded Solana wallets, delegated signing, authorization keys, and policy IDs. AXIOM then enforces the final destination and amount checks on-chain.

Devnet flow:

```text
QVAC agent -> Privy policy/delegated signer -> AXIOM policy check -> AXIOM protocol instruction
```

This gives the project a usable devnet answer for AI-managed money today, while leaving Ika dWallets as the future decentralized MPC path once public Solana CPI support is available.
