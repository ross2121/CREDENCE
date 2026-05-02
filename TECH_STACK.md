# AXIOM — Complete Tech Stack

## Blockchain Layer

| Component | Technology | Notes |
|---|---|---|
| Chain | Solana Mainnet-Beta | Target deployment |
| Smart Contracts | Anchor Framework 0.31.x | Type-safe Solana programs |
| Program Language | Rust 1.79+ | |
| Token Standard | SPL Token | USDT (USDt by Tether) |
| NFT Standard | Metaplex Core | Reputation NFTs |
| ZK Proofs | Groth16 via Bellman/Circom | Credit score proofs |

### USDT on Solana
```
Mint: Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
Decimals: 6
Program: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
```

---

## AI Layer (QVAC)

| Component | Technology | Notes |
|---|---|---|
| Runtime | QVAC SDK | Tether's local AI platform |
| Inference Engine | Vulkan API (via QVAC) | Hardware-agnostic |
| Credit Model | Fine-tuned instruction model | Runs locally |
| Yield Model | Fine-tuned instruction model | Runs locally |
| Platforms | Linux, macOS, Windows, Android, iOS | All supported |

### QVAC Integration
```bash
# Install QVAC SDK
npm install @qvac/sdk @qvac/cli

# Or Python
pip install qvac
```

AXIOM keeps QVAC inference optional for demo reliability. By default, tests use deterministic local fallback models. Set `AXIOM_QVAC_ENABLED=true` to route credit/yield decisions through `@qvac/sdk`; set `AXIOM_QVAC_REQUIRED=true` to fail instead of falling back if model loading fails.

---

## Protocol Integrations

| Protocol | SDK / API | Purpose |
|---|---|---|
| **Ika** | `@ika-xyz/sdk` | dWallet policy enforcement + cross-chain collateral |
| **Kamino** | `@kamino-finance/klend-sdk` | Idle USDT yield |
| **Torque** | Torque MCP Server | Autonomous growth campaigns |
| **GoldRush** | `@covalenthq/client-sdk` | Cross-chain credit data |
| **Birdeye** | `@birdeye-so/sdk` | Real-time collateral pricing |
| **QuickNode** | Custom Solana endpoint | RPC + WebSocket events |

---

## Frontend

| Component | Technology | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | |
| Styling | TailwindCSS + shadcn/ui | Component library |
| Animations | Framer Motion | Dashboard transitions |
| Charts | Recharts | APY history, earnings |
| State | Zustand | Global app state |
| Web3 | `@solana/web3.js` + `@solana/wallet-adapter` | Wallet connection |
| Embedded Wallet | Privy | New user onboarding |
| Real-time | WebSocket via QuickNode | Live pool stats |

---

## Backend / Offchain Services

| Component | Technology | Notes |
|---|---|---|
| API Server | Node.js + Fastify | REST API for non-Solana data |
| Credit Pipeline | Python 3.12 | GoldRush data processing |
| ZK Circuit | Circom 2.0 + snarkjs | Credit proof generation |
| Database | PostgreSQL | Loan metadata, analytics |
| Cache | Redis | APY rates, price feeds |
| Queue | BullMQ | Async credit scoring jobs |

---

## QVAC Agent Architecture

```
axiom-agents/
├── credit-agent/
│   ├── model/          # QVAC model config
│   ├── pipeline/
│   │   ├── goldrush_fetcher.py    # Pull cross-chain data
│   │   ├── feature_engineering.py # Build credit features
│   │   └── zk_proof_generator.py  # Generate Groth16 proof
│   └── agent.py        # QVAC agent wrapper
│
└── yield-agent/
    ├── model/          # QVAC model config
    ├── pipeline/
    │   ├── kamino_monitor.py      # Poll Kamino APY
    │   ├── birdeye_prices.py      # Real-time collateral prices
    │   └── torque_campaigns.py    # Torque MCP interface
    └── agent.py        # QVAC agent wrapper
```

---

## Solana Program Dependencies

```toml
# Cargo.toml
[dependencies]
anchor-lang = "0.31.0"
anchor-spl = "0.31.0"
solana-program = "2.1.0"

# External protocol CPIs
kamino-lending = { git = "https://github.com/Kamino-Finance/klend-sdk" }
ika-anchor = { git = "https://github.com/ika-xyz/ika-anchor" }
mpl-core = "0.9.0"   # Metaplex Core for reputation NFTs

# ZK verification
groth16-solana = "0.3.0"
```

---

## Environment Variables

```env
# Blockchain
SOLANA_RPC_URL=https://your-quicknode-endpoint.quiknode.pro/xxx/
SOLANA_WS_URL=wss://your-quicknode-endpoint.quiknode.pro/xxx/
AXIOM_PROGRAM_ID=<deployed program id>
USDT_MINT=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB

# Data APIs
GOLDRUSH_API_KEY=<covalent goldrush key>
BIRDEYE_API_KEY=<birdeye key>
TORQUE_API_KEY=<torque key>

# Protocol Addresses
KAMINO_PROGRAM_ID=KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD
IKA_PROGRAM_ID=<ika program id>

# QVAC
QVAC_MODEL_PATH=./models/axiom-credit-v1
QVAC_YIELD_MODEL_PATH=./models/axiom-yield-v1

# Frontend
NEXT_PUBLIC_RPC_URL=<quicknode endpoint>
PRIVY_APP_ID=<privy app id>
```

---

## Repository Structure

```
axiom/
├── programs/
│   └── axiom/                  # Anchor program
│       └── src/
├── axiom-agents/
│   ├── credit-agent/           # QVAC credit scoring agent
│   └── yield-agent/            # QVAC yield optimization agent
├── app/                        # Next.js frontend
│   ├── app/
│   │   ├── borrow/             # Borrower flow
│   │   ├── lend/               # Lender dashboard
│   │   └── analytics/          # Protocol stats
│   └── components/
├── sdk/                        # TypeScript SDK for AXIOM
│   └── src/
│       ├── credit.ts           # Credit proof utilities
│       ├── lending.ts          # Lending pool interactions
│       └── stream.ts           # Repayment stream helpers
├── circuits/
│   └── credit_score.circom     # ZK circuit for credit proof
├── tests/
│   ├── axiom.ts                # Anchor tests
│   └── integration/            # E2E tests on devnet
└── scripts/
    ├── deploy.sh               # Deploy program
    └── seed-pool.ts            # Initialize lending pool
```

---

## Deployment Targets

| Stage | Network | Notes |
|---|---|---|
| Development | Localnet | Full stack local |
| Testing | Devnet | All integrations mocked or devnet |
| Demo | Devnet | Live demo for hackathon |
| Production | Mainnet-Beta | Post-hackathon |

---

## Key SDK References

- Anchor: https://www.anchor-lang.com/docs
- Ika SDK: https://docs.ika.xyz
- Kamino SDK: https://github.com/Kamino-Finance/klend-sdk
- GoldRush SDK: https://goldrush.dev/docs
- Birdeye API: https://docs.birdeye.so
- Torque Docs: https://docs.torque.so
- QVAC SDK: https://qvac.tether.io/docs (Tether's QVAC platform)
- Privy Solana: https://docs.privy.io/guide/solana
