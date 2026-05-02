# AXIOM — User Flows

## Flow 1: Borrower — First-Time Loan

```
1. INSTALL & SETUP
   User downloads AXIOM app
   QVAC runtime boots locally (downloads base model)
   User connects Solana wallet (Phantom/Backpack or Privy embedded)
   App creates Ika dWallet bound to borrower policy

2. CREDIT SCORING (100% local)
   QVAC credit agent starts
   GoldRush fetches wallet history across Solana + other chains
   All data passed to local QVAC model (never leaves device)
   Model computes: credit_score = 724 → Silver Tier
   ZK proof generated: "score > 600, tier = Silver"
   User reviews result: "You qualify for up to $2,000 USDT at 12% APY"

3. REQUEST LOAN
   User sets loan parameters:
     Amount: $500 USDT
     Duration: 30 days
     Collateral: $250 USDC (50% for Silver tier)
   Ika dWallet submits ZK proof + collateral to AXIOM program
   AXIOM program verifies ZK proof on-chain
   Loan created with stream repayment schedule

4. RECEIVE FUNDS
   $500 USDT disbursed immediately via Ika dWallet
   Repayment stream initialized: $0.000193 USDT/second
   QVAC agent monitors wallet and auto-funds repayment stream

5. REPAYMENT (automated)
   QVAC agent runs daily check on repayment buffer
   If buffer < 7-day repayment amount: auto top-up via Ika dWallet
   Lender receives continuous USDT stream
   After 30 days: loan fully repaid, collateral returned

6. POST-LOAN
   Reputation NFT score +50 points (724 → 774)
   Next loan: approaching Gold tier
   On-chain history recorded → better credit score next time
```

---

## Flow 2: Borrower — Cross-Chain Collateral (via Ika)

```
1. User has 0.05 BTC on Bitcoin, wants USDT on Solana
   No bridge. No wrapping.

2. QVAC credit agent scores wallet → Gold Tier (score: 820)
   Gold tier: 25% collateral required
   Loan: $10,000 USDT → needs $2,500 collateral
   At current price, 0.012 BTC ≈ $2,500

3. Ika cross-chain position:
   User creates dWallet on Bitcoin via Ika
   Policy: BTC locked until loan repaid
   Attestation posted on Solana — AXIOM accepts as collateral

4. Loan disbursed: $10,000 USDT on Solana
   BTC controlled by Ika — cannot be moved by user until repaid

5. Repayment:
   QVAC agent streams USDT repayments automatically
   After full repayment: Ika releases BTC lock
   User has their BTC back + was able to use Solana DeFi

6. If liquidated instead:
   Ika sells BTC on Bitcoin (no bridge!)
   USDT routed to AXIOM lending pool on Solana
   User's reputation slashed
```

---

## Flow 3: Lender — Depositing and Earning

```
1. CONNECT & DEPOSIT
   Lender connects wallet
   App shows current pool APY: 8.4% base + 1.2% Torque rewards
   Comparison shown: Kamino USDT vault = 5.1%
   Lender deposits $10,000 USDT
   Ika dWallet created: can only move to AXIOM pool or Kamino

2. YIELD AGENT ACTIVATES (local QVAC)
   Monitors every 10 minutes:
     Pool utilization: 67%
     AXIOM APY: 8.4%
     Kamino APY: 5.1%
   Optimal allocation: 80% pool, 20% Kamino
   Agent executes: $8,000 in pool, $2,000 to Kamino

3. TORQUE REWARDS
   Protocol currently running lender campaign (via Torque MCP)
   Lender earns 50 TORQ/day for depositing >$5,000
   QVAC agent auto-claims TORQ rewards daily
   Total effective yield: 8.4% + TORQ value ≈ 10-12% effective

4. DYNAMIC REBALANCING
   Next morning: pool utilization drops to 35% (fewer borrowers)
   Torque MCP auto-creates new borrower incentive campaign
   QVAC yield agent detects: Kamino APY > pool APY at current utilization
   Rebalances: 50% pool, 50% Kamino
   Lender still earning 6.5% blended (better than doing nothing)

5. WITHDRAWAL
   Lender requests $5,000 withdrawal
   QVAC agent calculates: $3,000 in pool (liquid), $2,000 in Kamino
   Withdraws $3,000 from pool immediately
   Queues Kamino withdrawal for $2,000 (same block)
   Full $5,000 returned with accrued interest
```

---

## Flow 4: Repeat Borrower — Improved Credit Score

```
After 3 on-time repayments:
  Score: 724 → 774 → 831 (Gold tier reached)

New loan options:
  Before: $2,000 max, 12% APY, 50% collateral
  After:  $10,000 max, 8% APY, 25% collateral

User experience:
  QVAC re-scores wallet (new GoldRush data includes on-chain repayment history)
  New ZK proof generated for Gold tier
  User requests $5,000 loan with only $1,250 collateral (25%)
  Interest savings vs Silver: 4% × $5,000 = $200/year

This is the AXIOM credit flywheel — protocol learns from its own users.
```

---

## Flow 5: Dispute Resolution

```
Scenario: Borrower claims they funded repayment stream but lender
          hasn't received funds (on-chain discrepancy)

1. Borrower opens dispute via app
   Evidence hash submitted (QVAC agent generates audit trail)
   $100 USDT dispute bond locked from both parties

2. Arbitrator pool notified
   3 registered arbitrators (each staked 1000 USDT) assigned
   Each reviews evidence independently
   Each runs their own QVAC agent to analyze transaction history

3. Voting (48 hours)
   Arbitrators vote on-chain via encrypted commit-reveal
   Result: 2/3 vote in borrower's favor
   Finding: stream was funded, but lender's claim bot had a bug

4. Resolution
   Lender fixes bot, retroactively claims pending stream
   Both dispute bonds returned
   No reputation change for either party (edge case, not misconduct)
   Arbitrators earn 30 USDT each from protocol fee reserve
```

---

## Flow 6: Liquidation

```
Borrower: $5,000 USDT loan, ETH collateral via Ika (0.5 ETH = $7,000 at loan time)
Liquidation threshold: $5,500 (loan × 1.1)

Day 15 of loan:
  ETH drops from $14,000 to $10,500
  0.5 ETH = $5,250 → below $5,500 threshold

Step 1: Birdeye price feed detects threshold breach
Step 2: AXIOM program emits LiquidationWarning
Step 3: QuickNode WebSocket delivers event to borrower's QVAC agent in milliseconds
Step 4: QVAC agent alerts borrower: "Add $500 collateral in 1 hour or loan is liquidated"

Borrower adds 0.04 ETH ($420) → total collateral = $5,670 → safe

--- OR if borrower ignores warning ---

Step 5 (1 hour later): AXIOM program triggers liquidation
Step 6: Ika policy executes cross-chain sale of ETH on Ethereum
Step 7: $5,100 USDT equivalent routed to AXIOM lending pool on Solana
Step 8: Protocol absorbs $100 loss (covered by protocol insurance reserve)
Step 9: Borrower reputation slashed: score -150, stake burned
```

---

## Dashboard UX Summary

### Borrower Dashboard
- Credit score display (tier badge: Bronze/Silver/Gold/Platinum)
- Active loan: amount, time remaining, next auto-repayment
- ZK proof expiry (renew every 30 days)
- Repayment stream health (funded for X days)
- Reputation NFT with on-chain history

### Lender Dashboard
- Total deposited USDT
- Current allocation: pool vs Kamino
- Real-time earnings ticker (USDT/second)
- APY breakdown: base rate + Kamino + Torque rewards
- Historical APY chart (Birdeye data)
- Active Torque campaigns running on the protocol
- One-click: deposit more / withdraw / claim TORQ

### Protocol Analytics (public)
- Pool utilization rate (live)
- Total USDT deposited / borrowed
- Average credit tier distribution
- Repayment success rate
- Total TORQ rewards distributed
