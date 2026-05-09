import { readFileSync } from "fs";
import { join } from "path";
import { PublicKey } from "@solana/web3.js";
import {
  CreditAgent,
  QvacCreditModel,
} from "../axiom-agents/credit-agent/src";
import { YieldAgent, PoolSnapshot } from "../axiom-agents/yield-agent/src";

function fixture<T>(...parts: string[]): T {
  return JSON.parse(readFileSync(join(process.cwd(), ...parts), "utf8"));
}

async function main() {
  process.env.AXIOM_QVAC_ENABLED = "true";
  process.env.AXIOM_QVAC_REQUIRED = "true";
  process.env.AXIOM_QVAC_RUN = "true";
  process.env.AXIOM_QVAC_CREDIT_MODEL ??= "QWEN3_600M_INST_Q4";
  process.env.AXIOM_QVAC_YIELD_MODEL ??= "QWEN3_600M_INST_Q4";
  process.env.AXIOM_QVAC_CONTEXT_SIZE ??= "4096";

  const creditHistory = fixture<any>(
    "tests",
    "fixtures",
    "credit-agent",
    "gold-wallet.json"
  );
  const creditAgent = new CreditAgent(undefined as any, QvacCreditModel.fromEnv());
  const credit = await creditAgent.scoreWallet("gold-wallet", creditHistory);

  const yieldData = fixture<any>(
    "tests",
    "fixtures",
    "yield-agent",
    "low-utilization.json"
  );
  const pool: PoolSnapshot = {
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
  const yieldDecision = await new YieldAgent().decideWithQvac(
    pool,
    yieldData.market
  );

  console.log(
    JSON.stringify(
      {
        qvacRequired: process.env.AXIOM_QVAC_REQUIRED === "true",
        credit: {
          score: credit.decision.score,
          tier: credit.decision.tier,
          maxLoanUsdt: credit.decision.maxLoanUsdt,
          collateralBps: credit.decision.collateralBps,
          interestRateBps: credit.decision.interestRateBps,
          proofBytes: credit.proof.proof.length,
        },
        yield: yieldDecision,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
