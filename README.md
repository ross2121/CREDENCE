# AXIOM — Sovereign AI Credit & Yield Protocol

> _Your AI agent. Your data. Your money. Provably safe._

## What Is AXIOM?

AXIOM is a decentralized, private-AI-powered credit and yield protocol on Solana. It merges two primitives that DeFi has never had simultaneously:

1. **Private undercollateralized lending** — your creditworthiness is computed locally by a QVAC AI agent from cross-chain on-chain history, then proven on-chain via ZK proof. No KYC. No cloud. No data exposure.

2. **AI-optimized yield for lenders** — idle USDT in the lending pool is autonomously rebalanced between borrower interest and Kamino vaults by a local QVAC yield model. Lenders earn more without doing anything.

On Solana devnet, both sides are secured by **Privy wallet policy plus AXIOM on-chain policy**: agents can request actions, but every transaction is bounded by wallet-side authorization and program-side destination/amount checks. Ika dWallet support remains a future integration when public Solana CPI support is available.

---

## The Problem

| DeFi Lending Today                  | Reality                                            |
| ----------------------------------- | -------------------------------------------------- |
| Overcollateralized (Aave, Kamino)   | Need $150 to borrow $100. Capital inefficient.     |
| Undercollateralized (Maple, Credix) | Requires KYC, DAO whitelisting, centralized trust. |
| Cloud AI yield managers             | Your entire portfolio sent to a server.            |

AXIOM creates a third path: **provable creditworthiness with zero data exposure**, backed by AI that never leaves your device, and funds constrained by cryptographic policy so the AI can never go rogue.

---

## Core Thesis

```
Private AI (QVAC) + Privy/AXIOM Policy + Stablecoin Economy (USDT) + Solana =
The first truly sovereign DeFi credit protocol
```

---

## Hackathon Tracks

| Track                                      | Prize        | Status    |
| ------------------------------------------ | ------------ | --------- |
| Tether (QVAC + USDT)                       | $10,000 USDT | Primary   |
| Encrypt / Ika (bridgeless capital markets) | $15,000 USDC | Primary   |
| Eitherway (Kamino + QuickNode + Birdeye)   | $20,000 USDC | Primary   |
| Torque MCP                                 | $3,000 USDC  | Secondary |
| GoldRush by Covalent                       | $3,000 USDC  | Secondary |
| Colosseum Frontier Grand Champion          | $30,000      | Main      |
| Colosseum Public Goods Award               | $10,000      | Bonus     |

**Total sweep potential: ~$91,000**

---

## Directory

```
AXIOM/
├── README.md              ← this file
├── ARCHITECTURE.md        ← full system design + diagrams
├── INTEGRATIONS.md        ← deep dive on each tool/SDK
├── PROGRAMS.md            ← Solana program design (instructions, accounts)
├── USER_FLOWS.md          ← borrower, lender, arbitration flows
├── TRACKS.md              ← hackathon track details + submission strategy
└── TECH_STACK.md          ← complete stack, SDKs, APIs, versions
```

---

## Elevator Pitch

> "Aave needs $150 collateral for a $100 loan. Banks need your credit report. AXIOM needs neither.
>
> Your QVAC AI agent scores your creditworthiness from your on-chain history — privately, on your device. It generates a ZK proof that says 'this wallet qualifies' without revealing anything else. You borrow USDT on Solana. The AI repays it automatically.
>
> On the lender side, a QVAC agent optimizes your yield between borrower interest and Kamino vaults — without any cloud service ever seeing your portfolio.
>
> The AI agents are bound by Privy wallet policy and AXIOM on-chain policy. They can never move your money to an unauthorized destination through the protocol path. Not even if the AI is compromised.
>
> This is DeFi credit the way it should have always been."

---

## Submission Deadline

**May 11, 2026** — Colosseum Frontier closes.  
All side track submissions also due by May 11.

## Implementation Status

Anchor contract implementation is available in this repo with demo defaults for hackathon flows. Production-style builds disable mock protocol paths and are tracked in [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md).
