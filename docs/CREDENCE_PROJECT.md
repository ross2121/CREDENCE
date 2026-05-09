# Credence Project Documentation

Credence is a private AI credit and yield protocol on Solana devnet. The codebase still uses the original AXIOM program/module name in several places, but the product name for demos and submissions is **Credence**.

The core idea is simple: borrowers should be able to prove creditworthiness without revealing private wallet history or using KYC, and lenders should be able to earn yield without manually managing pool liquidity. Credence combines local QVAC AI inference, ZK credit proofs, Solana settlement, Privy wallet policy, collateral escrow, repayment streams, and Kamino yield routing.

## Problem

Most DeFi lending is overcollateralized. A borrower often needs more capital than they want to borrow, which makes lending safe but inefficient. Undercollateralized lending exists, but it usually depends on KYC, centralized underwriting, or whitelisted institutions.

Credence solves a different version of the problem:

- Borrowers prove a credit tier without revealing raw wallet history.
- Lenders supply stablecoin liquidity into a pool.
- Idle liquidity can be routed into Kamino vaults for yield.
- Repayment can be automated by an agent, but bounded by Privy and on-chain policy.
- If a borrower does not repay, escrowed collateral can be seized after a warning and grace period.

## Live Devnet Deployment

These are the current live devnet constants used by the app and scripts.

```text
AXIOM program:          6Xrd8Ymz9vxecWjifKern6LAzXQ2XKcS4D1zsJ8ENLpK
Lending pool PDA:      9vWqdDc68HmMijbbDviYmHYPo96Ru2FSL9CYbg22Guiu
Devnet USDC mint:      4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
AXIOM USDC vault:      AaywYs28UTX946bnaXya79GP9X6tj2ScVeb9Z1UHKQa6
Kamino devnet vault:   7uib8xGAwkaPz4ZGCA6t8sSEid5Yp9ty13PHUweTypx
Kamino shares account: GnQmmybmEs3gcRcwXRQVGqSGmABK2RRXBhLytTvgj7m
Kamino Kvault program: devkRngFnfp4gBc5a3LsadgbQKdPo8MSZ4prFiNSVmY
Kamino Klend program:  KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD
```

## Architecture

Credence has five main layers.

```text
Frontend app
  Borrow, lend, analytics, admin views

API / worker layer
  Optional backend services, data fetchers, keepers, analytics, job runners

AI agent layer
  QVAC credit agent and QVAC yield agent

ZK and proof layer
  Circuit, proof generation, on-chain verifier registration

Solana program layer
  Lending pool, proof registry, loan accounts, collateral escrow,
  repayment streams, liquidation state, Kamino rebalance hooks
```

## Borrower Flow

1. The borrower connects a Solana wallet.
2. The credit agent gathers wallet history data, usually through GoldRush when live API keys are configured.
3. QVAC runs locally and scores the borrower.
4. The score maps to a credit tier: bronze, silver, gold, or platinum.
5. A ZK proof is generated so the protocol can verify the tier without seeing the raw wallet data.
6. The borrower registers the proof on-chain.
7. The borrower requests a loan and deposits the required USDC collateral into an escrow vault controlled by the program.
8. The pool authority disburses USDC from the pool vault to the borrower.
9. A repayment stream is initialized.
10. The borrower or repayment agent funds the stream.
11. The pool claims repayments over time.
12. When the stream is fully repaid and claimed, the borrower closes the stream and gets collateral released.

## Lender Flow

1. A lender deposits USDC into the lending pool.
2. The pool tracks total deposits, borrowed amount, utilization, and available liquidity.
3. Borrower interest creates yield for lenders.
4. When liquidity is idle, the yield agent can route part of the pool to Kamino.
5. The pool keeps enough liquidity available for borrower demand and withdrawals.
6. The admin/lender dashboard shows pool state, Kamino allocation, liquid vault balance, and shares.

## QVAC

QVAC is used because the credit and yield decisions should not require sending sensitive user data to a cloud AI service.

Credence uses QVAC in two places:

```text
Credit agent:
  Scores borrower wallet history locally.

Yield agent:
  Decides whether idle pool liquidity should stay liquid or move to Kamino.
```

Why QVAC matters:

- **Local inference**: wallet history and portfolio signals can be processed on the user's machine or trusted backend without a cloud model seeing the raw data.
- **Privacy story**: the protocol receives only the proof output and tier, not the full borrower history.
- **Hackathon relevance**: QVAC is a core Tether Frontier track technology, and Credence uses it for load-bearing AI decisions instead of as a superficial add-on.
- **Demo reliability**: the repo has deterministic fallback paths, but `npm run qvac:verify-agents` runs with fallback disabled so the real QVAC path is verified.

Verified QVAC command:

```bash
npm run qvac:verify-agents
```

Expected important output:

```json
{
  "qvacRequired": true,
  "credit": {
    "tier": "gold",
    "proofBytes": 32
  },
  "yield": {
    "action": "depositToKamino"
  }
}
```

The model used in local verification:

```text
QWEN3_600M_INST_Q4
```

## ZK Proofs

The circuit proves that a private credit score satisfies a public tier threshold. The production-style circuit uses Poseidon commitments for wallet/model secrets rather than plain linear placeholders.

What the chain sees:

- tier threshold
- wallet commitment
- model commitment
- proof/public inputs
- expiry

What the chain does not see:

- raw wallet history
- transaction analysis details
- the private credit score input
- the local QVAC reasoning context

This gives the protocol a way to enforce credit gates without turning the lending protocol into a KYC database.

## Privy

Privy is used for wallet UX and delegated repayment policy.

Credence uses Privy in two ways:

```text
Frontend:
  Login and wallet connection UX through NEXT_PUBLIC_PRIVY_APP_ID.

Backend / agent automation:
  Optional delegated signer for repayment-related transactions.
```

The important production-style setup is a Solana policy:

```text
Chain type: SVM (Solana)
Method: signTransaction
Condition: Solana Program instruction Program ID equals AXIOM program ID
Action: Allow
```

Program ID:

```text
6Xrd8Ymz9vxecWjifKern6LAzXQ2XKcS4D1zsJ8ENLpK
```

Why Privy matters:

- It allows smoother onboarding than forcing every user into raw wallet tooling.
- It can support delegated repayment flows where an agent funds repayment streams.
- Privy policy constrains what the agent can sign.
- AXIOM on-chain policy still enforces borrower, program, recipient, and amount checks.

This is important: Privy is not the only safety layer. The Solana program still validates repayment policy on-chain.

Required Privy envs:

```bash
NEXT_PUBLIC_PRIVY_APP_ID=
PRIVY_APP_ID=
PRIVY_APP_SECRET=
PRIVY_AUTHORIZATION_KEY_ID=
PRIVY_AGENT_POLICY_ID=
PRIVY_AGENT_SIGNER_ID=
```

## Kamino

Kamino is used as the idle capital yield layer.

Lenders deposit USDC into Credence. Not all liquidity is always needed for active loans. Instead of leaving idle USDC unused, the yield agent can rebalance a portion into a Kamino vault.

Why Kamino matters:

- Lenders can earn from borrower interest and Kamino vault yield.
- Pool liquidity can be managed based on utilization.
- The integration demonstrates real Solana DeFi composability.
- The devnet vault and shares account are wired into the current app and scripts.

Current devnet Kamino constants:

```text
KAMINO_VAULT=7uib8xGAwkaPz4ZGCA6t8sSEid5Yp9ty13PHUweTypx
KAMINO_SHARES_ACCOUNT=GnQmmybmEs3gcRcwXRQVGqSGmABK2RRXBhLytTvgj7m
KAMINO_KVAULT_PROGRAM_ID=devkRngFnfp4gBc5a3LsadgbQKdPo8MSZ4prFiNSVmY
KAMINO_KLEND_PROGRAM_ID=KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD
```

Demo command:

```bash
npm run devnet:rebalance-kamino
```

## GoldRush

GoldRush is used as the wallet history data source for credit scoring.

The credit agent needs structured wallet history:

- wallet age
- chain activity
- stablecoin transfer behavior
- DeFi interactions
- repayment-like activity
- collateral positions
- portfolio history

GoldRush helps convert raw chain history into usable features. QVAC then scores those features locally.

Required env when using live data:

```bash
GOLDRUSH_API_KEY=
```

If no key is configured, demo fixtures and local fallback data can still be used.

## QuickNode

QuickNode is used for reliable Solana RPC and WebSocket infrastructure.

The public devnet RPC is acceptable for demos, but production-style operations need a more reliable endpoint for:

- sending transactions
- reading pool state
- monitoring account changes
- running keepers
- observing repayment/liquidation events

Recommended envs:

```bash
QUICKNODE_SOLANA_ENDPOINT=
QUICKNODE_SOLANA_WS_ENDPOINT=
```

If these are not set, the app can use:

```text
https://api.devnet.solana.com
wss://api.devnet.solana.com
```

## Birdeye / Price Feeds

Birdeye was planned for live market pricing and collateral monitoring. It is not required for the current core devnet flow.

What works without Birdeye:

- borrowing
- lending
- proof registration
- repayment streams
- collateral escrow
- Kamino rebalance
- manual liquidation warning/execution

What Birdeye would add:

- live token pricing
- richer collateral health automation
- market-aware liquidation triggers

If Birdeye is not available, leave:

```bash
BIRDEYE_API_KEY=
```

A production alternative is Pyth or Switchboard for oracle-style price feeds.

## Torque

Torque is optional. It is a growth and campaign automation layer, not required for the core credit protocol.

Potential Torque use:

- reward lenders when utilization is low
- reward borrowers who repay on time
- launch referral incentives
- let the yield/growth agent manage liquidity campaigns

Env:

```bash
TORQUE_API_KEY=
```

Leave it blank unless the campaign automation feature is enabled.

## Collateral Escrow

Credence does not rely only on reputation. When a borrower requests a loan, the program transfers real devnet USDC collateral into a program-controlled collateral vault.

Loan disbursement requires the collateral escrow to be locked.

If the borrower fully repays:

```text
collateral vault -> borrower
```

If the borrower defaults after warning and grace:

```text
collateral vault -> pool vault
```

This gives lenders a recovery path while still allowing lower collateral than traditional overcollateralized lending.

## Repayment Streams

Repayment streams let borrowers fund repayment over time instead of making a single final payment.

The stream tracks:

- total due
- funded amount
- accrued amount
- claimed amount
- available stream vault balance
- health

Pool authority can claim accrued repayments. The borrower can close the stream only after the stream is fully repaid and all due amounts are claimed.

## Liquidation

Liquidation has two phases:

1. **Warning**
   - A liquidation warning is issued.
   - The borrower has a grace period.

2. **Execution**
   - After grace, if conditions still hold, collateral can be seized into the pool.

This prevents instant seizure and gives the borrower a final chance to repay or top up.

Commands:

```bash
npm run devnet:issue-liquidation
npm run devnet:execute-liquidation
```

## Frontend Dashboard

The app contains these primary views:

```text
/borrow
  Borrower credit proof, loan request, repayment, Privy policy, liquidation controls

/lend
  Lender deposit/withdraw, pool stats, Kamino rebalance

/analytics
  Protocol health, credit distribution, utilization, repayment quality

/admin
  Pool authority operations and devnet runbook actions
```

The dashboard is designed to show a full narrative:

- local AI credit scoring
- ZK proof registration
- real devnet loan request
- collateral escrow
- repayment stream
- policy-constrained automation
- yield routing into Kamino
- liquidation safety path

## Environment Files

The repo now includes three example env files:

```text
.env.example
app/.env.example
api/.env.example
```

Use:

```bash
cp .env.example .env
cp app/.env.example app/.env.local
cp api/.env.example api/.env
```

Do not commit real `.env` files.

## Local Run Commands

Install:

```bash
npm install
npm --prefix app install
npm --prefix api install
```

Verify QVAC:

```bash
npm run qvac:smoke
npm run qvac:verify-agents
```

Run API:

```bash
npm run api:dev
```

Run frontend:

```bash
npm run app:dev
```

Open:

```text
http://localhost:3000
```

## Demo Script

Use this sequence for a strong demo:

1. Open the dashboard.
2. Show live devnet pool stats on the lend page.
3. Explain that lenders deposit USDC and idle capital can go to Kamino.
4. Go to the borrow page.
5. Show QVAC scoring, credit tier, and ZK proof registration.
6. Request a loan and show collateral required.
7. Explain that collateral is escrowed before disbursement.
8. Show repayment stream health and funding.
9. Show the Privy Solana policy: `signTransaction` limited to the AXIOM program.
10. Run `npm run qvac:verify-agents` in the terminal and show `qvacRequired: true`.
11. Show Kamino rebalance or explain the existing devnet rebalance.
12. Show liquidation warning/execution controls as lender protection.

Short narrative:

```text
Credence lets borrowers prove creditworthiness privately using local QVAC AI and ZK proofs, then access USDC loans on Solana. Lenders supply USDC, and the yield agent routes idle liquidity to Kamino. Privy constrains delegated repayment automation, while the on-chain program enforces collateral escrow, repayment streams, and liquidation rules.
```

## What Is Production-Ready on Devnet

Completed and verified on devnet:

- Solana program deployed.
- Lending pool initialized.
- USDC vault funded.
- Real lender deposit/withdraw flow.
- Real borrower proof registration.
- Real loan request and disbursement.
- Real collateral escrow.
- Real repayment stream initialization and funding.
- Real Kamino rebalance.
- Real liquidation warning.
- QVAC runtime verification.
- QVAC credit and yield agents with fallback disabled.
- Privy Solana policy created for AXIOM program signing.
- Frontend dashboard wired for borrow, lend, analytics, and admin flows.

Time-gated flows:

- Liquidation execution must wait until the on-chain grace period ends.
- Collateral release must wait until the repayment stream fully accrues and all due funds are claimed.

## Trust Model

Credence can be trusted only to the level of the components it enforces.

Strong guarantees:

- The Solana program controls pool, loans, collateral escrow, repayment streams, and liquidation state.
- Privy policy limits delegated signing to the AXIOM program.
- On-chain AXIOM policy validates agent repayment constraints.
- ZK proof flow prevents raw credit data from being posted on-chain.
- QVAC can run inference locally, reducing cloud AI data exposure.

Remaining trust assumptions:

- The credit model quality depends on wallet data and scoring logic.
- GoldRush/API data availability affects live scoring.
- Price feed automation needs a reliable oracle if fully automated liquidations are enabled.
- Admin/pool authority operations must be managed carefully.
- Privy secrets and server wallets must be stored securely.

## Deployment Pieces

For a full production-style deployment, deploy:

```text
Frontend app
API backend
Worker/keeper process
Solana program, already live on devnet unless changed
QVAC runtime/model on the machine that runs AI agents
Database and Redis if using persistent API analytics/jobs
```

Minimum hackathon/devnet deployment:

```text
Frontend app
Existing devnet program
Optional API
Optional keeper for automation
QVAC local verification for demo
```

