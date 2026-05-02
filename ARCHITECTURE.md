# AXIOM — System Architecture

## High-Level Overview

AXIOM has four layers:

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 4: CLIENT INTELLIGENCE (QVAC — local, no cloud)          │
│                                                                   │
│  Borrower Device              Lender Device                      │
│  ┌─────────────────┐         ┌──────────────────┐               │
│  │ QVAC Credit     │         │ QVAC Yield        │               │
│  │ Agent           │         │ Agent             │               │
│  │ • Score wallet  │         │ • Monitor APYs    │               │
│  │ • ZK proof gen  │         │ • Rebalance funds │               │
│  │ • Auto-repay    │         │ • Claim rewards   │               │
│  └────────┬────────┘         └────────┬──────────┘               │
└───────────┼───────────────────────────┼─────────────────────────┘
            │                           │
┌───────────┼───────────────────────────┼─────────────────────────┐
│  LAYER 3: DATA FEEDS                  │                          │
│           │                           │                          │
│  GoldRush API          Birdeye API    │    QuickNode RPC         │
│  (credit history)      (collateral    │    (fast tx execution)   │
│  multi-chain data       pricing)      │                          │
└───────────┼───────────────────────────┼─────────────────────────┘
            │                           │
┌───────────┼───────────────────────────┼─────────────────────────┐
│  LAYER 2: CRYPTOGRAPHIC CUSTODY (IKA dWALLETS)                  │
│                                                                   │
│  Agent sends partial signature                                    │
│       ↓                                                           │
│  Solana program checks policy                                     │
│       ↓                                                           │
│  Ika MPC network completes signature                              │
│       ↓                                                           │
│  Transaction broadcasts (Solana or cross-chain)                   │
│                                                                   │
│  Policy Examples:                                                 │
│  • Borrower agent: can ONLY send to repayment contract            │
│  • Lender agent: can ONLY deposit to [Kamino, AXIOM pool]         │
│  • No other destination is ever valid — cryptographically         │
└───────────┼───────────────────────────┼─────────────────────────┘
            │                           │
┌───────────┼───────────────────────────┼─────────────────────────┐
│  LAYER 1: SOLANA PROGRAMS (on-chain settlement)                  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  AXIOM CORE PROTOCOL                      │   │
│  │                                                           │   │
│  │  lending_pool      credit_registry    stream_repay        │   │
│  │  • USDT deposits   • ZK proof store   • per-second        │   │
│  │  • loan disburse   • score tiers      • USDT stream       │   │
│  │  • liquidation     • reputation NFT   • milestone         │   │
│  │                                         release           │   │
│  │  dispute           torque_hooks        ika_policy         │   │
│  │  • arbitration     • reward triggers   • agent bounds     │   │
│  │  • slash stake     • campaign mgmt     • policy check     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  External Protocols:                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Kamino    │  │  Ika Network │  │   Torque Protocol    │   │
│  │  (yield)    │  │  (MPC sign)  │  │  (incentive camps)   │   │
│  └─────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## PRISM + COVENANT Merge Logic

### Why They Belong Together

COVENANT (credit) and PRISM (yield) share the same underlying infrastructure:

```
Shared:
  - QVAC runtime on device
  - Ika dWallet for all agent actions
  - USDT as the settlement token
  - Solana as the execution layer
  - QuickNode as the RPC

COVENANT adds:
  - GoldRush credit data pipeline
  - ZK proof generation
  - Lending pool + loan lifecycle
  - Reputation NFTs

PRISM adds:
  - Yield optimization model
  - Kamino SDK integration
  - Torque MCP reward automation
  - Birdeye real-time pricing
```

The merge creates a **flywheel**:
- Better credit scores → lower collateral requirements → more borrowing demand
- More borrowing demand → higher APY for lenders
- Higher lender APY + Torque rewards → more liquidity deposited
- More liquidity → protocol can serve more borrowers
- More borrowers → more repayment data → better credit models

---

## Credit Scoring Architecture

```
Input (via GoldRush — fetched locally by QVAC agent):
  wallet_age_days           (proxy: commitment)
  total_tx_count            (proxy: activity)
  avg_tx_value_usdt         (proxy: financial scale)
  defi_protocol_count       (proxy: sophistication)
  lp_position_history       (proxy: long-term thinking)
  previous_loan_repayments  (direct: credit history)
  current_collateral_ratio  (direct: financial health)
  usdt_holding_consistency  (proxy: savings behavior)
  cross_chain_activity      (proxy: experience)
  nft_holding_duration      (proxy: hold vs dump)

QVAC Local Model:
  → Gradient boosted model or small neural net
  → Runs entirely on device via QVAC runtime
  → Outputs: credit_score (0-1000), max_loan_usdt, risk_tier

ZK Proof (on-device):
  → Proves: credit_score > threshold
  → Does NOT reveal: wallet address, actual score, feature values
  → Proof posted on-chain via Ika dWallet
  → Verifier program checks proof validity
```

### Credit Tiers

| Tier | Score | Max Loan | Collateral Required | Interest Rate |
|---|---|---|---|---|
| Bronze | 400-599 | $500 USDT | 80% | 18% APY |
| Silver | 600-749 | $2,000 USDT | 50% | 12% APY |
| Gold | 750-899 | $10,000 USDT | 25% | 8% APY |
| Platinum | 900-1000 | $50,000 USDT | 10% | 5% APY |

---

## Yield Optimization Architecture

```
Lender deposits USDT
       ↓
QVAC yield agent (local) monitors:
  → AXIOM pool APY (from borrower interest)
  → Kamino USDT vault APY (idle yield)
  → Torque reward rate (bonus incentive)
  → Pool utilization rate
       ↓
Optimization model computes allocation:
  If utilization > 80%:
    → Keep 95% in pool (high borrower demand, better yield)
    → 5% in Kamino (liquidity buffer)
  If utilization < 40%:
    → Keep 50% in pool
    → 50% to Kamino (avoid idle capital loss)
    → Trigger Torque campaign (attract borrowers)
       ↓
Ika dWallet executes allocation
(policy: can only touch Kamino + AXIOM pool)
       ↓
Lender earns blended APY automatically
```

---

## Ika dWallet Policy Design

### Borrower Agent Policy
```rust
// On-chain policy definition
BorrowerPolicy {
    allowed_destinations: [
        axiom_repayment_contract,   // only valid outbound
    ],
    max_single_tx: loan_amount,
    tx_frequency: daily,
    cross_chain: false,             // Solana only for repayments
}
```

### Lender Agent Policy
```rust
LenderPolicy {
    allowed_destinations: [
        axiom_lending_pool,
        kamino_usdt_vault,
        torque_reward_claim,
    ],
    max_single_tx: u64::MAX,        // can move full balance
    cross_chain: false,
}
```

### Cross-Chain Collateral Policy (for BTC/ETH collateral)
```rust
CrossChainCollateralPolicy {
    origin_chain: "bitcoin" | "ethereum",
    destination: axiom_collateral_vault,
    release_condition: loan_repaid_fully,  // only releases when loan closed
    liquidation_trigger: collateral_value < loan_value * 1.1,
}
```

---

## Repayment Streaming

USDT repayments stream per-second using a custom Solana program (not Streamflow — native):

```
Loan: $1,000 USDT for 30 days at 8% APY
Total owed: $1,006.58 USDT
Per second: $1,006.58 / (30 * 86400) = $0.000388 USDT/second

Borrower's QVAC agent:
  → Monitors repayment contract balance
  → Tops up from wallet when balance drops below 7-day buffer
  → Operates via Ika dWallet (can only send to repayment contract)

Lender sees balance tick up in real-time
```

---

## Liquidation Flow

```
Birdeye sends price update
       ↓
Solana program checks: collateral_value < loan_value × 1.1
       ↓
If yes: emit LiquidationWarning event
       ↓
Borrower QVAC agent gets 1-hour grace period to top up collateral
       ↓
If not topped up: automatic liquidation via Ika dWallet
  → Cross-chain collateral sold via Ika
  → USDT returned to lending pool
  → Reputation NFT slashed
  → Borrower credit score drops 150 points
```

---

## Torque MCP Automation

The QVAC yield agent uses Torque's MCP to self-manage protocol growth:

```
Every 6 hours, QVAC agent evaluates:

IF pool_utilization < 40%:
  → torque_mcp.create_campaign(
      type: "lender_incentive",
      reward: "50 TORQ per 100 USDT deposited",
      duration: "7 days"
    )

IF repayment_rate_this_month > 95%:
  → torque_mcp.airdrop(
      recipients: all_on_time_repayers,
      amount: "10 TORQ each"
    )

IF new_borrower_count < 10_this_week:
  → torque_mcp.create_campaign(
      type: "referral",
      reward: "25 TORQ per referred borrower who takes a loan"
    )
```

Protocol grows itself. No manual campaign management needed.

---

## Data Flow Summary

```
GoldRush → QVAC Credit Agent → ZK Proof → Solana Credit Registry
Birdeye  → QVAC Yield Agent  → Ika dWallet → Kamino / AXIOM Pool
Torque MCP ← QVAC Yield Agent (creates/manages campaigns autonomously)
QuickNode → All on-chain transactions (RPC layer)
```
