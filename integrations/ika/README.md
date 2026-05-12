# AXIOM Ika Integration

This package connects AXIOM's Solana policy layer to Ika dWallet flows.

- borrower policies for repayment destinations
- lender policies for pool and Kamino routing
- cross-chain collateral policies
- policy-checked transaction wrappers
- an unauthorized-destination demo path

## Current implementation

AXIOM already enforces dWallet-style constraints on Solana through the
`ika_policy` Anchor account. A policy binds an owner, a dWallet public key, an
allowlist of destinations, a maximum transaction amount, and optional
cross-chain metadata. Repayment and yield actions can be wrapped with an AXIOM
policy check before the actual protocol instruction executes.

The live Ika SDK adapter is in `src/sdk.ts`. It loads `@ika.xyz/sdk` and
`@mysten/sui` at runtime so local policy tests can run without the pre-alpha
network packages installed.

```typescript
import {
  createIkaSdkClient,
  createIkaUserShareKeys,
  ikaSolanaSigningDefaults,
} from "./src";

const ika = await createIkaSdkClient({ network: "testnet" });
const defaults = ikaSolanaSigningDefaults();
const userShare = await createIkaUserShareKeys(
  crypto.getRandomValues(new Uint8Array(32)),
  defaults.curve
);
```

## Install live Ika dependencies

```bash
npm install @ika.xyz/sdk @mysten/sui
```

The Ika docs list Solana dWallet signing as pre-alpha. For Solana-native
signatures, AXIOM uses Ika's Ed25519/EdDSA/SHA512 primitive selection, then
stores the resulting dWallet identity in the existing Solana policy PDA.

## Integration boundary

Today:

- AXIOM can initialize and verify policy accounts on Solana devnet.
- The adapter can initialize a real Ika SDK client and derive user-share key
  material when the Ika packages are installed.
- The UI's Privy delegated signer remains a working devnet fallback for demos.

Next Ika step:

- Replace the Privy delegated signer with a completed Ika dWallet signature
  once the pre-alpha Solana signing flow exposes the dWallet creation/signing
  objects needed by this app.
