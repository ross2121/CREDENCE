# AXIOM — Integration Deep Dives

## 1. QVAC (Tether's Local AI Platform)

**What it is**: Tether's decentralized, local-first AI SDK. Runs LLMs directly on any device using Vulkan API (hardware-agnostic). Zero data leaves the device. Works on Linux, macOS, Windows, Android, iOS.

**Why AXIOM uses it**: QVAC is the brain of every agent. Credit scoring and yield optimization must never touch a cloud — that's the core privacy guarantee of AXIOM. QVAC makes this possible without sacrificing AI quality.

**Two AXIOM agents built on QVAC:**

### Credit Agent (Borrower)

```python
from qvac import Agent, LocalModel

credit_agent = Agent(model=LocalModel("axiom-credit-v1"))

async def compute_credit_score(wallet_address: str) -> CreditResult:
    # GoldRush data fetched locally first
    chain_data = await goldrush_client.get_wallet_history(wallet_address)

    # All computation on-device — zero network call for inference
    result = await credit_agent.run(
        system="""You are AXIOM's credit scoring engine.
        Analyze the provided on-chain history and compute:
        1. Credit score (0-1000)
        2. Maximum loan amount in USDT
        3. Recommended interest rate tier
        4. Risk factors
        Never reveal raw scores — only return tier classification.""",
        prompt=f"Wallet history: {chain_data.to_json()}"
    )
    return parse_credit_result(result)
```

### Yield Agent (Lender)

```python
yield_agent = Agent(model=LocalModel("axiom-yield-v1"))

async def optimize_yield_allocation(pool_state: PoolState) -> Allocation:
    result = await yield_agent.run(
        system="""You are AXIOM's yield optimization engine.
        Given current pool state, compute optimal USDT allocation between:
        - AXIOM lending pool (borrower interest)
        - Kamino USDT vault (idle yield)
        Maximize risk-adjusted return for the lender.""",
        prompt=f"Pool state: {pool_state.to_json()}"
    )
    return parse_allocation(result)
```

**Integration notes**:

- QVAC SDK: install via their platform SDK
- Models: custom fine-tuned or base instruction models
- Runtime: works in Node.js (via FFI bindings) and Python

---

## 2. Privy + AXIOM Policy (Active Solana Devnet)

**What it is**: Privy provides Solana embedded wallets, authorization keys, delegated signers, and wallet policies. AXIOM provides the on-chain destination and amount checks that every agent action must pass.

**Why AXIOM uses it on devnet**: It gives a usable Solana wallet-policy path today. The AI agent can prepare actions, but Privy controls signing permissions and AXIOM rejects transactions that exceed the on-chain policy.

**Active devnet flow:**

```text
QVAC agent -> Privy policy/delegated signer -> AXIOM policy check -> AXIOM instruction
```

**Policy-enforced repayment:**

```typescript
const policy = privyPolicy.borrowerPolicy({
  owner: borrower,
  agentWallet: privyEmbeddedWallet,
  repaymentDestination: AXIOM_REPAYMENT_STREAM,
  maxTransactionAmount: loanAmount,
  privyPolicyId: process.env.PRIVY_AGENT_POLICY_ID,
});

privyPolicy.validateOffchain(policy, repaymentAction);
const txs = privyPolicy.enforce(repaymentAction, () =>
  axiom.fundRepaymentStream(repaymentAmount)
);
```

## 3. Ika dWallets (Future Bridgeless Capital Markets)

Ika remains the intended decentralized MPC and bridgeless collateral layer. Public Solana CPI support is not currently wired in this repo because Ika's public docs do not provide a Solana devnet program ID, IDL, or CPI account layout. When that is available, AXIOM can replace or supplement the Privy signer-policy layer with Ika dWallet signing.

**What it is**: A 2PC-MPC cryptographic protocol that splits signing authority between the user/agent and Ika's decentralized MPC network. Neither side can sign alone. Solana programs define policies that the MPC network enforces before completing any signature.

**Why AXIOM uses it**: Solves the hardest unsolved problem in AI-managed DeFi — _"How do you trust an AI with your money?"_. With Ika, the answer is: _you don't have to_. The policy is law. The agent is bounded.

**AXIOM's dWallet usage:**

### Creating a Borrower dWallet

```typescript
import { IkaClient } from "@ika-xyz/sdk";

const ika = new IkaClient({ network: "mainnet" });

// Create dWallet for the borrower's QVAC agent
const dWallet = await ika.createDWallet({
  policy: {
    // Agent can ONLY send USDT to the repayment contract
    allowedDestinations: [AXIOM_REPAYMENT_CONTRACT],
    maxTransactionAmount: loanAmount,
    tokenWhitelist: [USDT_MINT],
    crossChain: false,
  },
  owner: borrowerPublicKey,
});
```

### Policy-Enforced Agent Signing

```typescript
// QVAC agent wants to make repayment
const tx = await buildRepaymentTransaction({
  amount: weeklyRepayment,
  destination: AXIOM_REPAYMENT_CONTRACT,
  dWallet: dWallet.address,
});

// Agent signs with its share
const partialSig = await dWallet.sign(tx, agentKeypair);

// Ika MPC network verifies policy, completes signature
// If destination is NOT on the allowlist — signature NEVER completes
const completedTx = await ika.completeSigning(partialSig);
await sendAndConfirmTransaction(connection, completedTx);
```

### Cross-Chain Collateral (BTC/ETH → Solana)

```typescript
// Borrower posts native BTC as collateral — no bridge, no wrapping
const crossChainCollateral = await ika.createCrossChainPosition({
  sourceChain: "bitcoin",
  sourceAsset: "BTC",
  amount: 0.01, // 0.01 BTC
  policy: {
    // BTC can ONLY be released when loan is fully repaid
    releaseCondition: "axiom_loan_repaid",
    liquidationTrigger: "collateral_value < loan_value * 1.1",
    liquidationDestination: AXIOM_LENDING_POOL,
  },
});
// Returns a Solana-native attestation of the BTC position
// AXIOM program treats this as valid collateral
```

**Bridgeless capital markets in practice:**

- A borrower with ETH on Ethereum can use it as collateral on AXIOM (Solana) without wrapping
- Ika's MPC network controls the ETH directly on Ethereum via the dWallet
- If liquidated, Ika sells the ETH on Ethereum and routes USDT to Solana — no bridge needed

---

## 4. GoldRush by Covalent (Credit Data Layer)

**What it is**: A multi-chain blockchain data API that provides structured, decoded on-chain data across 100+ chains. Unlike raw RPC, GoldRush returns decoded events, token metadata, USD pricing, and classified transaction types.

**Why AXIOM uses it**: Credit scoring is only as good as its data. GoldRush provides the full cross-chain financial history of a borrower's wallet — not just their Solana activity. A borrower with 3 years of on-chain DeFi history on Ethereum is more creditworthy than a new Solana wallet, even if the Solana wallet is new.

**AXIOM's GoldRush integration:**

```typescript
import { GoldRushClient } from "@covalenthq/client-sdk";

const client = new GoldRushClient(GOLDRUSH_API_KEY);

async function buildCreditProfile(
  walletAddress: string
): Promise<CreditProfile> {
  // Solana transaction history
  const solanaTxs =
    await client.TransactionService.getAllTransactionsForAddressByPage(
      "solana-mainnet",
      walletAddress
    );

  // Cross-chain balances (Ethereum, Base, etc.)
  const ethBalances =
    await client.BalanceService.getTokenBalancesForWalletAddress(
      "eth-mainnet",
      walletAddress
    );

  // Historical portfolio value (tracks if they hold or dump)
  const portfolioHistory =
    await client.BalanceService.getHistoricalPortfolioForWalletAddress(
      "solana-mainnet",
      walletAddress,
      {
        days: 365,
      }
    );

  // DeFi protocol interactions (decoded — knows it's a Kamino deposit)
  const defiActivity =
    await client.TransactionService.getTransactionsForAddressByPage(
      "solana-mainnet",
      walletAddress,
      {
        "no-logs": false, // include decoded logs
      }
    );

  // Previous USDT transfer patterns
  const usdtTransfers =
    await client.TokenService.getErc20TransfersForWalletAddressByPage(
      "solana-mainnet",
      walletAddress,
      { contractAddress: USDT_MINT }
    );

  return buildFeatureVector({
    solanaTxs,
    ethBalances,
    portfolioHistory,
    defiActivity,
    usdtTransfers,
  });
}
```

**Features extracted from GoldRush data:**

| Feature                 | GoldRush Source               | Credit Signal         |
| ----------------------- | ----------------------------- | --------------------- |
| Wallet age              | First transaction timestamp   | Commitment            |
| Transaction consistency | Monthly tx counts             | Active vs dormant     |
| DeFi sophistication     | Decoded protocol interactions | Experience level      |
| USDT holding pattern    | Token balance history         | Saves vs spends       |
| Cross-chain activity    | Multi-chain balance check     | Broader experience    |
| Collateral history      | LP positions over time        | Long-term thinker     |
| Previous repayments     | AXIOM loan event logs         | Direct credit history |

**GoldRush x402**: Their new API designed specifically for AI agents — structured data formatted for LLM consumption. Perfect for QVAC agents that need to reason over on-chain history.

---

## 5. Torque Protocol + MCP

**What it is**: Solana's growth and incentive protocol. Lets projects create targeted reward campaigns (airdrops, rebates, leaderboards, trading contests) with no-code or via their MCP server. MCP = Model Context Protocol, letting AI agents create and manage campaigns through natural language.

**Why AXIOM uses it**: The lending pool needs to balance supply (lenders) and demand (borrowers). Manually creating campaigns is operational overhead. Torque MCP lets the QVAC yield agent manage this autonomously — the protocol grows itself.

**AXIOM's Torque MCP integration:**

```python
# QVAC yield agent uses Torque MCP for autonomous growth management

from torque_mcp import TorqueMCPClient

torque = TorqueMCPClient(api_key=TORQUE_API_KEY)

class AXIOMGrowthManager:

    async def manage_liquidity_incentives(self, pool_state: PoolState):
        utilization = pool_state.borrowed_usdt / pool_state.total_usdt

        # Low utilization: attract more lenders
        if utilization < 0.40:
            await torque.run(
                "Create a 7-day campaign rewarding lenders who deposit "
                "at least 100 USDT with 50 TORQ per day"
            )

        # High utilization: attract more borrowers to borrow more
        if utilization > 0.85:
            await torque.run(
                "Create a referral campaign: 25 TORQ for every new "
                "borrower referred who successfully takes a loan"
            )

    async def reward_good_borrowers(self, repayment_stats: RepaymentStats):
        if repayment_stats.on_time_rate > 0.95:
            await torque.run(
                f"Airdrop 10 TORQ to all {repayment_stats.on_time_count} "
                "borrowers who repaid on time this month"
            )

    async def run_trading_contest(self):
        # Monthly contest: most USDT volume borrowed + repaid
        await torque.run(
            "Create a monthly leaderboard: top 10 borrowers by total "
            "USDT volume borrowed and repaid earn 500/300/200/100 TORQ"
        )
```

**Why this is a legitimate Torque use case:**

- Lending protocols need active liquidity management
- Manual campaign management doesn't scale
- AI-driven campaigns that respond to real-time pool state = genuinely novel
- Torque's MCP was built exactly for this agent-driven use case

---

## 6. Kamino Finance (Yield on Idle Capital)

**What it is**: Solana's leading yield optimization protocol. Supports automated liquidity management, lending vaults, and concentrated liquidity strategies for USDT and other assets.

**Why AXIOM uses it**: Idle capital in a lending pool earns nothing. AXIOM routes unused USDT to Kamino vaults, ensuring lenders always earn something even when borrowing demand is low.

**AXIOM's Kamino integration:**

```typescript
import { KaminoClient, VaultConfig } from "@kamino-finance/klend-sdk";

const kamino = new KaminoClient(connection, KAMINO_PROGRAM_ID);

// Deposit idle USDT to Kamino vault
async function depositIdleCapital(amount: BN, lenderWallet: PublicKey) {
  const vault = await kamino.getVaultByMint(USDT_MINT);

  const depositTx = await vault.deposit({
    user: lenderWallet,
    amount,
    collateralToken: USDT_MINT,
  });

  // Executed via Ika dWallet (policy-enforced)
  return await executeViaIkaDWallet(depositTx, lenderWallet);
}

// Withdraw when borrowing demand picks up
async function withdrawForLoan(amount: BN, lenderWallet: PublicKey) {
  const vault = await kamino.getVaultByMint(USDT_MINT);
  return await vault.withdraw({ user: lenderWallet, amount });
}

// Real-time APY monitoring for yield model
async function getKaminoAPY(): Promise<number> {
  const vault = await kamino.getVaultByMint(USDT_MINT);
  return vault.calculateAPY();
}
```

**Capital allocation model:**

```
AXIOM Pool Utilization → Kamino Allocation

< 30%  utilization  → 60% to Kamino, 40% in pool
30-50% utilization  → 40% to Kamino, 60% in pool
50-70% utilization  → 20% to Kamino, 80% in pool
> 70%  utilization  → 5% to Kamino (liquidity buffer only), 95% in pool
```

---

## 7. QuickNode (RPC Infrastructure)

**What it is**: Enterprise-grade Solana RPC provider with dedicated endpoints, websocket streams, and add-on APIs (token price, NFT metadata, etc.).

**Why AXIOM uses it**: All AXIOM transactions — loan disbursements, repayment streams, Kamino deposits, Ika dWallet operations — need reliable, fast execution. QuickNode dedicated endpoints eliminate rate limiting and provide sub-100ms transaction confirmation.

**AXIOM's QuickNode setup:**

```typescript
import { Connection } from "@solana/web3.js";

// Dedicated QuickNode endpoint (not public RPC)
const connection = new Connection(process.env.QUICKNODE_SOLANA_ENDPOINT, {
  commitment: "confirmed",
  wsEndpoint: process.env.QUICKNODE_SOLANA_WS_ENDPOINT,
});

// WebSocket for real-time loan event monitoring
connection.onProgramAccountChange(AXIOM_PROGRAM_ID, (accountInfo) => {
  const event = decodeAxiomEvent(accountInfo.accountInfo.data);
  if (event.type === "LiquidationWarning") {
    notifyBorrowerAgent(event.borrower);
  }
});
```

**QuickNode add-ons used:**

- Token Price API: real-time USDT/USD peg monitoring
- Transaction Simulation: pre-flight checks before Ika signing
- Account WebSockets: real-time liquidation monitoring

---

## 8. Birdeye (Price Feeds + Analytics)

**What it is**: Solana's leading on-chain price aggregator. Provides real-time token prices, OHLCV data, wallet analytics, and historical price feeds.

**Why AXIOM uses it**: Two critical functions — collateral valuation (for liquidation triggers) and the lender analytics dashboard (showing earnings, pool APY trends, portfolio value).

**AXIOM's Birdeye integration:**

```typescript
import { BirdeyeClient } from "@birdeye/api";

const birdeye = new BirdeyeClient({ apiKey: BIRDEYE_API_KEY });

// Real-time collateral price for liquidation monitoring
async function getCollateralValue(
  collateralMint: string,
  amount: number
): Promise<number> {
  const price = await birdeye.getTokenPrice(collateralMint);
  return price.value * amount;
}

// Check if liquidation threshold breached
async function checkLiquidationRisk(loan: Loan): Promise<boolean> {
  const collateralValue = await getCollateralValue(
    loan.collateralMint,
    loan.collateralAmount
  );
  const liquidationThreshold = loan.principal * 1.1;
  return collateralValue < liquidationThreshold;
}

// Lender dashboard: historical APY of the AXIOM pool
async function getPoolAPYHistory(days: number) {
  return await birdeye.getOHLCV(AXIOM_POOL_TOKEN, {
    resolution: "1D",
    from: Date.now() - days * 86400000,
    to: Date.now(),
  });
}

// Portfolio analytics for lender
async function getLenderPortfolioStats(walletAddress: string) {
  return await birdeye.getWalletPortfolio(walletAddress);
}
```
