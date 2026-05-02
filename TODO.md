# AXIOM Implementation Todo

## Commit Rule

- Complete one feature at a time.
- Run the relevant checks for that feature.
- Commit immediately after each feature is working.
- Do not mix unrelated features in the same commit.

## 1. Contracts / Anchor Program

### 1.1 Project Scaffold

- [x] Initialize Anchor workspace.
- [x] Create `programs/axiom/src` module layout.
- [x] Add base dependencies: `anchor-lang`, `anchor-spl`, SPL token helpers.
- [x] Add placeholder program id and localnet config.
- [x] Add TypeScript Anchor test harness.
- [x] Commit: `feat(contract): scaffold axiom anchor program`

### 1.2 Core State Accounts

- [x] Implement `LendingPool` account.
- [x] Implement `Loan` account and `LoanStatus`.
- [x] Implement `CreditProof` account and `CreditTier`.
- [x] Implement `ReputationAccount`.
- [x] Add account sizing constants.
- [x] Add serialization tests where useful.
- [x] Commit: `feat(contract): add core protocol state`

### 1.3 Lending Pool Instructions

- [x] Implement pool initialization.
- [x] Implement USDT deposit liquidity.
- [x] Implement utilization-aware withdrawal.
- [x] Implement loan disbursement from the pool vault.
- [x] Track total deposits, borrowed amount, utilization, and vault balances.
- [x] Add tests for deposit, withdraw, insufficient liquidity, and disbursement.
- [x] Commit: `feat(contract): implement lending pool instructions`

### 1.4 Credit Registry and Loan Request

- [x] Implement credit proof registration.
- [x] Store proof hash, tier, expiry, and max loan.
- [x] Validate proof expiry.
- [x] Validate tier max loan amount.
- [x] Validate collateral requirement by tier.
- [x] Implement loan request creation.
- [x] Add tests for tier limits, expired proof, insufficient collateral, and valid loan creation.
- [x] Commit: `feat(contract): implement credit registry and loan requests`

### 1.5 ZK Proof Verifier Stub

- [x] Add Groth16 verifier interface.
- [x] Add local/mock verifier for hackathon demo.
- [x] Wire `verify_credit_proof` into proof registration.
- [x] Define public inputs: tier threshold, wallet hash, model hash.
- [x] Add tests for accepted and rejected proofs.
- [x] Commit: `feat(contract): add zk credit proof verification`

### 1.6 Repayment Streaming

- [x] Implement repayment stream initialization.
- [x] Compute stream rate from principal, APY, and duration.
- [x] Implement stream funding.
- [x] Implement accrued repayment claiming.
- [x] Implement stream close on full repayment.
- [x] Update loan status and amount repaid.
- [x] Add tests for accrual over time, underfunded streams, claim, and close.
- [x] Commit: `feat(contract): implement repayment streams`

### 1.7 Reputation System

- [x] Implement reputation account initialization.
- [x] Implement reputation NFT mint hook or Metaplex Core integration stub.
- [x] Implement successful repayment score update.
- [x] Implement default/liquidation slash.
- [x] Implement USDT reputation bond staking.
- [x] Add tests for score changes, counters, and stake accounting.
- [x] Commit: `feat(contract): implement reputation accounting`

### 1.8 Ika Policy Checks

- [x] Define borrower, lender, and cross-chain collateral policy account data.
- [x] Add Ika verifier CPI interface.
- [x] Add local/mock Ika verifier for hackathon demo.
- [x] Enforce allowed destinations for agent-triggered actions.
- [x] Add tests for allowed repayment, blocked destination, and max transaction amount.
- [x] Commit: `feat(contract): enforce ika policy checks`

### 1.9 Kamino Rebalance Hooks

- [x] Add Kamino CPI interface or demo stub.
- [x] Implement rebalance to Kamino.
- [x] Implement rebalance from Kamino.
- [x] Track Kamino allocation bps and last rebalance timestamp.
- [x] Add tests for rebalance accounting and authorization.
- [x] Commit: `feat(contract): add kamino rebalance hooks`

### 1.10 Liquidation and Price Safety

- [x] Add collateral valuation inputs.
- [x] Implement liquidation warning event.
- [x] Implement grace-period tracking.
- [x] Implement liquidation execution path.
- [x] Slash reputation on liquidation.
- [x] Return recovered USDT to pool accounting.
- [x] Add tests for safe collateral, warning, grace period, and liquidation.
- [x] Commit: `feat(contract): implement liquidation flow`

### 1.11 Disputes and Arbitration

- [x] Implement dispute account.
- [x] Implement dispute opening with evidence hash.
- [x] Implement arbitrator registration and stake requirement.
- [x] Implement arbitration vote submission.
- [x] Implement dispute finalization.
- [x] Add tests for opening, voting thresholds, finalization, and stake behavior.
- [x] Commit: `feat(contract): implement dispute arbitration`

### 1.12 Contract Hardening

- [x] Add complete error codes from `PROGRAMS.md`.
- [x] Audit PDA seeds, bumps, signer constraints, and token constraints.
- [x] Add event emissions for app and agent listeners.
- [x] Add localnet seed script for USDT pool setup.
- [x] Run full Anchor test suite.
- [x] Commit: `chore(contract): harden protocol checks and events`

## 2. ZK Credit Circuit

- [x] Create `circuits/credit_score.circom`.
- [x] Encode tier threshold proof.
- [x] Include wallet hash and model hash public inputs.
- [x] Add proof generation script with `snarkjs`.
- [x] Add verifier artifact export for the Anchor program.
- [x] Add sample proof fixtures for Bronze, Silver, Gold, and Platinum.
- [x] Commit: `feat(zk): add credit tier proof circuit`

## 3. SDK

- [x] Create TypeScript SDK package.
- [x] Add lending pool client helpers.
- [x] Add credit proof registration helpers.
- [x] Add loan request and repayment stream helpers.
- [x] Add Ika policy transaction builders.
- [x] Add typed account decoders.
- [x] Add SDK unit tests with mocked Anchor provider.
- [x] Commit: `feat(sdk): add axiom protocol client`

## 4. QVAC Credit Agent

- [x] Scaffold `axiom-agents/credit-agent`.
- [x] Implement GoldRush wallet history fetcher.
- [x] Implement feature engineering pipeline.
- [x] Implement local credit model wrapper.
- [x] Implement tier and max loan calculation.
- [x] Implement ZK proof generation call.
- [x] Implement loan proof submission through SDK.
- [x] Add fixture-based tests for feature extraction and tier output.
- [x] Commit: `feat(agent): implement qvac credit agent`

## 5. QVAC Yield Agent

- [x] Scaffold `axiom-agents/yield-agent`.
- [x] Implement pool state monitor.
- [x] Implement Kamino APY monitor.
- [x] Implement Birdeye price and APY data fetcher.
- [x] Implement allocation strategy by utilization bands.
- [x] Implement rebalance transaction builder through Ika policy.
- [x] Implement daily reward claim flow.
- [x] Add tests for allocation decisions.
- [x] Commit: `feat(agent): implement qvac yield agent`

## 6. Protocol Integrations

### 6.1 GoldRush

- [x] Add GoldRush SDK client.
- [x] Fetch Solana transaction history.
- [x] Fetch cross-chain balances.
- [x] Fetch historical portfolio data.
- [x] Extract USDT transfer patterns.
- [x] Add fixtures for offline demo mode.
- [x] Commit: `feat(integration): add goldrush credit data`

### 6.2 Ika

- [x] Add Ika SDK client.
- [x] Create borrower dWallet policy.
- [x] Create lender dWallet policy.
- [x] Build policy-enforced signing helper.
- [x] Add unauthorized destination demo.
- [x] Commit: `feat(integration): add ika dwallet policies`

### 6.3 Kamino

- [x] Add Kamino SDK client.
- [x] Resolve USDT vault.
- [x] Implement deposit and withdrawal helpers.
- [x] Implement APY fetcher.
- [x] Add mocked fallback for demo reliability.
- [x] Commit: `feat(integration): add kamino yield routing`

### 6.4 Birdeye

- [x] Add Birdeye API client.
- [x] Fetch collateral token price.
- [x] Fetch lender portfolio stats.
- [x] Fetch pool APY history.
- [x] Add liquidation risk helper.
- [x] Commit: `feat(integration): add birdeye pricing`

### 6.5 QuickNode

- [x] Add QuickNode RPC and WebSocket config.
- [x] Implement program event listener.
- [x] Implement liquidation warning listener.
- [x] Add transaction simulation helper.
- [x] Commit: `feat(integration): add quicknode realtime rpc`

### 6.6 Torque MCP

- [x] Add Torque MCP client.
- [x] Create lender incentive campaign flow.
- [x] Create borrower referral campaign flow.
- [x] Create good-repayer airdrop flow.
- [x] Gate campaigns by utilization and repayment metrics.
- [x] Commit: `feat(integration): add torque mcp campaigns`

## 7. Frontend App

### 7.1 App Scaffold

- [x] Create Next.js 15 app with TailwindCSS and shadcn/ui.
- [x] Add Solana wallet adapter.
- [x] Add Privy embedded wallet support.
- [x] Add Zustand app store.
- [x] Add base layout and navigation for Borrow, Lend, Analytics.
- [x] Commit: `feat(app): scaffold axiom frontend`

### 7.2 Borrower Flow

- [x] Build wallet connection and dWallet setup screen.
- [x] Build credit scoring status view.
- [x] Build tier result and max loan view.
- [x] Build loan parameter form.
- [x] Build active loan dashboard.
- [x] Build repayment stream health view.
- [x] Commit: `feat(app): build borrower loan flow`

### 7.3 Lender Flow

- [x] Build deposit and withdraw flow.
- [x] Build current allocation view.
- [x] Build real-time earnings ticker.
- [x] Build APY breakdown.
- [x] Build Torque reward claim view.
- [x] Commit: `feat(app): build lender dashboard`

### 7.4 Analytics

- [ ] Build pool utilization dashboard.
- [ ] Build total deposited and borrowed stats.
- [ ] Build credit tier distribution chart.
- [ ] Build repayment success chart.
- [ ] Build Torque rewards chart.
- [ ] Commit: `feat(app): build protocol analytics`

### 7.5 Demo Polish

- [ ] Add deterministic demo mode.
- [ ] Add mocked APIs for no-key local demos.
- [ ] Add loading, empty, error, and success states.
- [ ] Verify responsive desktop and mobile layouts.
- [ ] Commit: `feat(app): add hackathon demo mode`

## 8. Backend Services

- [ ] Create Fastify API server.
- [ ] Add PostgreSQL schema for loan metadata and analytics.
- [ ] Add Redis cache for APY and price feeds.
- [ ] Add BullMQ jobs for async scoring and analytics refresh.
- [ ] Add health checks.
- [ ] Commit: `feat(api): scaffold backend services`

## 9. Scripts and Deployment

- [ ] Add localnet bootstrap script.
- [ ] Add devnet deploy script.
- [ ] Add pool seeding script.
- [ ] Add environment example file.
- [ ] Add CI checks for contracts, SDK, agents, and frontend.
- [ ] Commit: `chore(devops): add deployment and ci scripts`

## 10. End-to-End Demo

- [ ] Demo: borrower gets scored locally and registers proof.
- [ ] Demo: borrower requests USDT loan.
- [ ] Demo: repayment stream ticks and lender claims.
- [ ] Demo: Ika blocks unauthorized agent destination.
- [ ] Demo: lender deposits and yield agent rebalances to Kamino.
- [ ] Demo: Torque campaign created from utilization trigger.
- [ ] Demo: Birdeye liquidation warning path.
- [ ] Commit: `feat(demo): wire end-to-end axiom flow`

## 11. Hackathon Submission Package

- [ ] Record 2-minute borrower loan demo.
- [ ] Record lender yield optimization demo.
- [ ] Record Ika policy-block demo.
- [ ] Prepare Tether/QVAC submission copy.
- [ ] Prepare Ika submission copy.
- [ ] Prepare Eitherway submission copy.
- [ ] Prepare Torque submission copy.
- [ ] Prepare GoldRush submission copy.
- [ ] Prepare Colosseum main submission copy.
- [ ] Commit: `docs(submission): add hackathon package`
