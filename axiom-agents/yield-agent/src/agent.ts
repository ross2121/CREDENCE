import { AxiomClient } from "../../../sdk/src";
import {
  AgentRebalancePolicy,
  AllocationDecision,
  PoolSnapshot,
} from "./types";
import { YieldStrategy } from "./strategy";
import { QvacYieldStrategy } from "./qvac-strategy";

export class YieldAgent {
  constructor(
    readonly strategy = new YieldStrategy(),
    readonly qvacStrategy = QvacYieldStrategy.fromEnv()
  ) {}

  decide(pool: PoolSnapshot, market: Parameters<YieldStrategy["decide"]>[1]) {
    return this.strategy.decide(pool, market);
  }

  async decideWithQvac(
    pool: PoolSnapshot,
    market: Parameters<YieldStrategy["decide"]>[1]
  ) {
    return this.qvacStrategy.decide(pool, market);
  }

  buildRebalanceTransactions(
    client: AxiomClient,
    decision: AllocationDecision,
    policy: AgentRebalancePolicy
  ) {
    if (decision.action === "hold") return [];
    if (decision.amountUsdt > policy.maxTransactionAmountUsdt) {
      throw new Error("Rebalance amount exceeds agent policy limit");
    }

    const amount = Math.floor(decision.amountUsdt);
    const policyCheck = client.verifyAgentPolicy(
      policy.agentWallet,
      policy.kaminoProgram,
      amount
    );
    const rebalance =
      decision.action === "depositToKamino"
        ? client.rebalanceToKamino(amount)
        : client.rebalanceFromKamino(amount);

    return [policyCheck, rebalance];
  }

  buildDailyRewardClaim(policy: AgentRebalancePolicy) {
    return {
      destination: policy.kaminoProgram,
      maxAmountUsdt: policy.maxTransactionAmountUsdt,
      memo: "AXIOM daily Kamino reward claim",
    };
  }
}
