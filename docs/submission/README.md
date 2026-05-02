# AXIOM Hackathon Submission Package

## Demo Commands

```bash
npm run demo:e2e
npm run qvac:smoke
npm run app:dev
npm run api:build
API_PORT=8080 node api/dist/server.js
```

## Demo URLs

- Borrower flow: `http://localhost:3000/borrow`
- Lender dashboard: `http://localhost:3000/lend`
- Analytics: `http://localhost:3000/analytics`
- API health: `http://localhost:8080/health`

## Video Recording Plan

### 1. Borrower Loan Demo

Length: 2 minutes.

1. Open `/borrow`.
2. Show wallet and dWallet policy panel.
3. Show credit scoring steps: GoldRush history, QVAC scoring, ZK proof.
4. Adjust principal and duration.
5. Show active loan and repayment stream health.
6. Run `npm run demo:e2e` and point to `proofRegistered`, `loanRequested`, and `repaymentClaimBuilt`.

### 2. Lender Yield Optimization Demo

Length: 90 seconds.

1. Open `/lend`.
2. Show deposit and withdraw flow.
3. Show current allocation between AXIOM and Kamino.
4. Show live earnings ticker and APY breakdown.
5. Show Torque rewards claim panel.
6. Run `npm run demo:e2e` and point to `yieldAction` and `torqueCampaign`.

### 3. Ika Policy Block Demo

Length: 45 seconds.

1. Explain that the borrower agent can only repay to the AXIOM stream vault.
2. Run `npm run demo:e2e`.
3. Show `ikaBlocked: true`.
4. Open `/borrow` and show the dWallet policy panel.

## Submission Assets

- Main pitch: `colosseum.md`
- Tether/QVAC track: `tether-qvac.md`
- Ika track: `ika.md`
- Eitherway track: `eitherway.md`
- Torque track: `torque.md`
- GoldRush track: `goldrush.md`
