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

- [ ] Implement repayment stream initialization.
- [ ] Compute stream rate from principal, APY, and duration.
- [ ] Implement stream funding.
- [ ] Implement accrued repayment claiming.
- [ ] Implement stream close on full repayment.
- [ ] Update loan status and amount repaid.
- [ ] Add tests for accrual over time, underfunded streams, claim, and close.
- [ ] Commit: `feat(contract): implement repayment streams`

### 1.7 Reputation System

- [ ] Implement reputation account initialization.
- [ ] Implement reputation NFT mint hook or Metaplex Core integration stub.
- [ ] Implement successful repayment score update.
- [ ] Implement default/liquidation slash.
- [ ] Implement USDT reputation bond staking.
- [ ] Add tests for score changes, counters, and stake accounting.
- [ ] Commit: `feat(contract): implement reputation accounting`

### 1.8 Ika Policy Checks

- [ ] Define borrower, lender, and cross-chain collateral policy account data.
- [ ] Add Ika verifier CPI interface.
- [ ] Add local/mock Ika verifier for hackathon demo.
- [ ] Enforce allowed destinations for agent-triggered actions.
- [ ] Add tests for allowed repayment, blocked destination, and max transaction amount.
- [ ] Commit: `feat(contract): enforce ika policy checks`

### 1.9 Kamino Rebalance Hooks

- [ ] Add Kamino CPI interface or demo stub.
- [ ] Implement rebalance to Kamino.
- [ ] Implement rebalance from Kamino.
- [ ] Track Kamino allocation bps and last rebalance timestamp.
- [ ] Add tests for rebalance accounting and authorization.
- [ ] Commit: `feat(contract): add kamino rebalance hooks`

### 1.10 Liquidation and Price Safety

- [ ] Add collateral valuation inputs.
- [ ] Implement liquidation warning event.
- [ ] Implement grace-period tracking.
- [ ] Implement liquidation execution path.
- [ ] Slash reputation on liquidation.
- [ ] Return recovered USDT to pool accounting.
- [ ] Add tests for safe collateral, warning, grace period, and liquidation.
- [ ] Commit: `feat(contract): implement liquidation flow`

### 1.11 Disputes and Arbitration

- [ ] Implement dispute account.
- [ ] Implement dispute opening with evidence hash.
- [ ] Implement arbitrator registration and stake requirement.
- [ ] Implement arbitration vote submission.
- [ ] Implement dispute finalization.
- [ ] Add tests for opening, voting thresholds, finalization, and stake behavior.
- [ ] Commit: `feat(contract): implement dispute arbitration`

### 1.12 Contract Hardening

- [ ] Add complete error codes from `PROGRAMS.md`.
- [ ] Audit PDA seeds, bumps, signer constraints, and token constraints.
- [ ] Add event emissions for app and agent listeners.
- [ ] Add localnet seed script for USDT pool setup.
- [ ] Run full Anchor test suite.
- [ ] Commit: `chore(contract): harden protocol checks and events`

## 2. ZK Credit Circuit

- [ ] Create `circuits/credit_score.circom`.
- [ ] Encode tier threshold proof.
- [ ] Include wallet hash and model hash public inputs.
- [ ] Add proof generation script with `snarkjs`.
- [ ] Add verifier artifact export for the Anchor program.
- [ ] Add sample proof fixtures for Bronze, Silver, Gold, and Platinum.
- [ ] Commit: `feat(zk): add credit tier proof circuit`

## 3. SDK

- [ ] Create TypeScript SDK package.
- [ ] Add lending pool client helpers.
- [ ] Add credit proof registration helpers.
- [ ] Add loan request and repayment stream helpers.
- [ ] Add Ika policy transaction builders.
- [ ] Add typed account decoders.
- [ ] Add SDK unit tests with mocked Anchor provider.
- [ ] Commit: `feat(sdk): add axiom protocol client`

## 4. QVAC Credit Agent

- [ ] Scaffold `axiom-agents/credit-agent`.
- [ ] Implement GoldRush wallet history fetcher.
- [ ] Implement feature engineering pipeline.
- [ ] Implement local credit model wrapper.
- [ ] Implement tier and max loan calculation.
- [ ] Implement ZK proof generation call.
- [ ] Implement loan proof submission through SDK.
- [ ] Add fixture-based tests for feature extraction and tier output.
- [ ] Commit: `feat(agent): implement qvac credit agent`

## 5. QVAC Yield Agent

- [ ] Scaffold `axiom-agents/yield-agent`.
- [ ] Implement pool state monitor.
- [ ] Implement Kamino APY monitor.
- [ ] Implement Birdeye price and APY data fetcher.
- [ ] Implement allocation strategy by utilization bands.
- [ ] Implement rebalance transaction builder through Ika policy.
- [ ] Implement daily reward claim flow.
- [ ] Add tests for allocation decisions.
- [ ] Commit: `feat(agent): implement qvac yield agent`

## 6. Protocol Integrations

### 6.1 GoldRush

- [ ] Add GoldRush SDK client.
- [ ] Fetch Solana transaction history.
- [ ] Fetch cross-chain balances.
- [ ] Fetch historical portfolio data.
- [ ] Extract USDT transfer patterns.
- [ ] Add fixtures for offline demo mode.
- [ ] Commit: `feat(integration): add goldrush credit data`

### 6.2 Ika

- [ ] Add Ika SDK client.
- [ ] Create borrower dWallet policy.
- [ ] Create lender dWallet policy.
- [ ] Build policy-enforced signing helper.
- [ ] Add unauthorized destination demo.
- [ ] Commit: `feat(integration): add ika dwallet policies`

### 6.3 Kamino

- [ ] Add Kamino SDK client.
- [ ] Resolve USDT vault.
- [ ] Implement deposit and withdrawal helpers.
- [ ] Implement APY fetcher.
- [ ] Add mocked fallback for demo reliability.
- [ ] Commit: `feat(integration): add kamino yield routing`

### 6.4 Birdeye

- [ ] Add Birdeye API client.
- [ ] Fetch collateral token price.
- [ ] Fetch lender portfolio stats.
- [ ] Fetch pool APY history.
- [ ] Add liquidation risk helper.
- [ ] Commit: `feat(integration): add birdeye pricing`

### 6.5 QuickNode

- [ ] Add QuickNode RPC and WebSocket config.
- [ ] Implement program event listener.
- [ ] Implement liquidation warning listener.
- [ ] Add transaction simulation helper.
- [ ] Commit: `feat(integration): add quicknode realtime rpc`

### 6.6 Torque MCP

- [ ] Add Torque MCP client.
- [ ] Create lender incentive campaign flow.
- [ ] Create borrower referral campaign flow.
- [ ] Create good-repayer airdrop flow.
- [ ] Gate campaigns by utilization and repayment metrics.
- [ ] Commit: `feat(integration): add torque mcp campaigns`

## 7. Frontend App

### 7.1 App Scaffold

- [ ] Create Next.js 15 app with TailwindCSS and shadcn/ui.
- [ ] Add Solana wallet adapter.
- [ ] Add Privy embedded wallet support.
- [ ] Add Zustand app store.
- [ ] Add base layout and navigation for Borrow, Lend, Analytics.
- [ ] Commit: `feat(app): scaffold axiom frontend`

### 7.2 Borrower Flow

- [ ] Build wallet connection and dWallet setup screen.
- [ ] Build credit scoring status view.
- [ ] Build tier result and max loan view.
- [ ] Build loan parameter form.
- [ ] Build active loan dashboard.
- [ ] Build repayment stream health view.
- [ ] Commit: `feat(app): build borrower loan flow`

### 7.3 Lender Flow

- [ ] Build deposit and withdraw flow.
- [ ] Build current allocation view.
- [ ] Build real-time earnings ticker.
- [ ] Build APY breakdown.
- [ ] Build Torque reward claim view.
- [ ] Commit: `feat(app): build lender dashboard`

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
