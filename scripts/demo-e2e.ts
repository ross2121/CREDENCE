import { readFileSync } from "fs";
import { join } from "path";
import { PublicKey } from "@solana/web3.js";
import { CreditAgent } from "../axiom-agents/credit-agent/src";
import { YieldAgent, YieldStrategy } from "../axiom-agents/yield-agent/src";
import { AxiomClient } from "../sdk/src";
import { PrivyPolicyClient } from "../integrations/privy-policy/src";
import { BirdeyeClient } from "../integrations/birdeye/src";
import { TorqueMcpClient } from "../integrations/torque/src";

type Call = [string, ...unknown[]];

function fixture<T>(...parts: string[]): T {
  return JSON.parse(
    readFileSync(join(process.cwd(), "tests", "fixtures", ...parts), "utf8")
  ) as T;
}

function mockProgram() {
  const calls: Call[] = [];
  const method =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, ...args]);
      return { name, args };
    };

  return {
    calls,
    programId: PublicKey.unique(),
    methods: {
      registerCreditProof: method("registerCreditProof"),
      requestLoan: method("requestLoan"),
      initRepaymentStream: method("initRepaymentStream"),
      fundRepaymentStream: method("fundRepaymentStream"),
      claimRepayments: method("claimRepayments"),
      verifyIkaPolicy: method("verifyIkaPolicy"),
      depositLiquidity: method("depositLiquidity"),
      rebalanceToKamino: method("rebalanceToKamino"),
    },
  } as any;
}

async function main() {
  const program = mockProgram();
  const client = new AxiomClient(program);
  const borrower = PublicKey.unique();
  const repaymentVault = PublicKey.unique();
  const blockedDestination = PublicKey.unique();
  const agentWallet = PublicKey.unique();

  const creditAgent = new CreditAgent();
  const credit = await creditAgent.scoreWallet(
    borrower.toBase58(),
    fixture("credit-agent", "gold-wallet.json")
  );
  creditAgent.buildProofRegistration(client, credit.decision, credit.proof);
  creditAgent.buildLoanRequest(client, credit.decision, {
    amountUsdt: 5_000,
    durationDays: 30,
    ikaDwallet: agentWallet,
  });

  client.initRepaymentStream();
  client.fundRepaymentStream(500);
  client.claimRepayments();

  const privy = new PrivyPolicyClient(client);
  const policy = privy.borrowerPolicy({
    owner: borrower,
    agentWallet,
    repaymentDestination: repaymentVault,
    maxTransactionAmount: 5_000,
    privyPolicyId: "policy_devnet_borrower",
  });
  let privyBlocked = false;
  try {
    privy.validateOffchain(policy, {
      agentWallet,
      destination: blockedDestination,
      amount: 100,
      description: "Blocked repayment destination demo",
    });
  } catch {
    privyBlocked = true;
  }

  client.depositLiquidity(10_000);
  const yieldData = fixture<any>("yield-agent", "low-utilization.json");
  const pool = {
    lendingPool: PublicKey.unique(),
    usdtVault: PublicKey.unique(),
    kaminoVault: PublicKey.unique(),
    liquidUsdt: yieldData.liquidUsdt,
    totalDeposits: yieldData.totalDeposits,
    totalBorrowed: yieldData.totalBorrowed,
    kaminoAllocatedUsdt: yieldData.kaminoAllocatedUsdt,
    kaminoAllocationBps: yieldData.kaminoAllocationBps,
    lastRebalance: yieldData.lastRebalance,
  };
  const yieldDecision = new YieldStrategy().decide(pool, yieldData.market);
  new YieldAgent().buildRebalanceTransactions(client, yieldDecision, {
    agentWallet: PublicKey.unique(),
    kaminoProgram: PublicKey.unique(),
    maxTransactionAmountUsdt: 5_000,
    privyPolicyId: "policy_devnet_lender",
  });

  const torque = new TorqueMcpClient({
    fixture: fixture("torque", "campaigns.json"),
  });
  const campaigns = await torque.manageLiquidityCampaigns({
    utilizationBps: 3_500,
    totalDepositsUsdt: 10_000,
    totalBorrowedUsdt: 3_500,
  });

  const birdeye = new BirdeyeClient({
    fixture: fixture("birdeye", "market.json"),
  });
  const liquidationRisk = await birdeye.liquidationRisk({
    collateralAmount: 10,
    collateralMint: "SOL",
    debtUsdt: 1_240,
    liquidationThresholdBps: 8_000,
  });

  const summary = {
    borrowerTier: credit.decision.tier,
    proofRegistered: program.calls.some(
      (call) => call[0] === "registerCreditProof"
    ),
    loanRequested: program.calls.some((call) => call[0] === "requestLoan"),
    repaymentClaimBuilt: program.calls.some(
      (call) => call[0] === "claimRepayments"
    ),
    privyBlocked,
    yieldAction: yieldDecision.action,
    torqueCampaign: campaigns[0]?.campaignId,
    liquidationShouldWarn: liquidationRisk.shouldWarn,
    sdkCalls: program.calls.map((call) => call[0]),
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
