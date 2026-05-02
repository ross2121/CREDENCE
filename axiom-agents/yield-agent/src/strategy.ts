import { AllocationDecision, PoolSnapshot, YieldMarketSnapshot } from "./types";

export type YieldStrategyConfig = {
  minLiquidBufferBps: number;
  highUtilizationBps: number;
  lowUtilizationBps: number;
  minApySpreadBps: number;
  maxKaminoAllocationBps: number;
  minRebalanceUsdt: number;
};

export const DEFAULT_YIELD_STRATEGY: YieldStrategyConfig = {
  minLiquidBufferBps: 2_000,
  highUtilizationBps: 7_000,
  lowUtilizationBps: 4_000,
  minApySpreadBps: 150,
  maxKaminoAllocationBps: 7_000,
  minRebalanceUsdt: 100,
};

export class YieldStrategy {
  constructor(readonly config = DEFAULT_YIELD_STRATEGY) {}

  decide(pool: PoolSnapshot, market: YieldMarketSnapshot): AllocationDecision {
    if (pool.totalDeposits <= 0) {
      return hold("empty pool", pool.kaminoAllocationBps);
    }

    const utilizationBps = Math.floor(
      (pool.totalBorrowed * 10_000) / pool.totalDeposits
    );
    const availableAfterBuffer = Math.max(
      pool.totalDeposits -
        pool.totalBorrowed -
        Math.floor(
          (pool.totalDeposits * this.config.minLiquidBufferBps) / 10_000
        ) -
        pool.kaminoAllocatedUsdt,
      0
    );
    const apySpread = market.kaminoApyBps - market.poolBaseApyBps;

    if (utilizationBps >= this.config.highUtilizationBps) {
      const targetBps = Math.max(pool.kaminoAllocationBps - 2_500, 0);
      const targetAmount = Math.floor(
        (pool.totalDeposits * targetBps) / 10_000
      );
      const amount = pool.kaminoAllocatedUsdt - targetAmount;

      if (amount >= this.config.minRebalanceUsdt) {
        return {
          action: "withdrawFromKamino",
          amountUsdt: amount,
          targetKaminoAllocationBps: targetBps,
          reason: "high pool utilization needs liquid USDT",
        };
      }
    }

    if (
      utilizationBps <= this.config.lowUtilizationBps &&
      apySpread >= this.config.minApySpreadBps
    ) {
      const targetBps = Math.min(
        this.config.maxKaminoAllocationBps,
        pool.kaminoAllocationBps + 2_500
      );
      const targetAmount = Math.floor(
        (pool.totalDeposits * targetBps) / 10_000
      );
      const amount = Math.min(
        Math.max(targetAmount - pool.kaminoAllocatedUsdt, 0),
        availableAfterBuffer
      );

      if (amount >= this.config.minRebalanceUsdt) {
        return {
          action: "depositToKamino",
          amountUsdt: amount,
          targetKaminoAllocationBps: targetBps,
          reason: "idle liquidity can earn higher Kamino APY",
        };
      }
    }

    return hold(
      "allocation is within strategy bands",
      pool.kaminoAllocationBps
    );
  }
}

function hold(reason: string, currentBps: number): AllocationDecision {
  return {
    action: "hold",
    amountUsdt: 0,
    targetKaminoAllocationBps: currentBps,
    reason,
  };
}
