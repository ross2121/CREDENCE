# AXIOM Devnet Runbook

## Required Environment

```bash
export SOLANA_RPC_URL=https://api.devnet.solana.com
export ANCHOR_PROVIDER_WALLET=~/.config/solana/id.json
export AXIOM_PROGRAM_ID=6Xrd8Ymz9vxecWjifKern6LAzXQ2XKcS4D1zsJ8ENLpK
export USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
export USDT_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
export USDT_VAULT=AaywYs28UTX946bnaXya79GP9X6tj2ScVeb9Z1UHKQa6
```

Frontend:

```bash
export NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
export NEXT_PUBLIC_AXIOM_PROGRAM_ID=6Xrd8Ymz9vxecWjifKern6LAzXQ2XKcS4D1zsJ8ENLpK
export NEXT_PUBLIC_PRIVY_APP_ID=<privy-app-id>
```

QVAC, if running the local adapter:

```bash
export QVAC_BASE_URL=http://127.0.0.1:11434
export QVAC_MODEL=<model-name>
```

## Live Devnet Accounts

```text
Program: 6Xrd8Ymz9vxecWjifKern6LAzXQ2XKcS4D1zsJ8ENLpK
Pool: 9vWqdDc68HmMijbbDviYmHYPo96Ru2FSL9CYbg22Guiu
Pool USDC vault: AaywYs28UTX946bnaXya79GP9X6tj2ScVeb9Z1UHKQa6
Kamino vault: 7uib8xGAwkaPz4ZGCA6t8sSEid5Yp9ty13PHUweTypx
Kamino shares: GnQmmybmEs3gcRcwXRQVGqSGmABK2RRXBhLytTvgj7m
```

## Borrow Flow

```bash
npm run devnet:zk-proof
LOAN_USDT=0.1 COLLATERAL_USDT=0.05 LOAN_DURATION_DAYS=1 npm run devnet:request-loan
BORROWER=<borrower-wallet> LOAN=<loan-pda> npm run devnet:disburse-loan
LOAN=<loan-pda> npm run devnet:init-stream
REPAY_USDT=0.11 LOAN=<loan-pda> npm run devnet:fund-stream
LOAN=<loan-pda> npm run devnet:claim-stream
LOAN=<loan-pda> npm run devnet:close-stream
```

`close-stream` succeeds only after the stream has fully accrued and all due funds have been claimed.

## Liquidation Flow

```bash
npm run devnet:mint-reputation
LOAN=<loan-pda> COLLATERAL_VALUE_USDC=0.05 LOAN_VALUE_USDC=0.1 npm run devnet:issue-liquidation
BORROWER=<borrower-wallet> LOAN=<loan-pda> npm run devnet:execute-liquidation
```

`execute-liquidation` succeeds only after the one-hour grace period.

## Kamino Flow

```bash
npm run kamino:devnet:vaults
npm run devnet:rebalance-kamino
```
