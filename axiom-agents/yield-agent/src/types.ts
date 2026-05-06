import { PublicKey } from "@solana/web3.js";

export type PoolSnapshot = {
  lendingPool: PublicKey;
  usdtVault: PublicKey;
  kaminoVault: PublicKey;
  liquidUsdt: number;
  totalDeposits: number;
  totalBorrowed: number;
  kaminoAllocatedUsdt: number;
  kaminoAllocationBps: number;
  lastRebalance: number;
};

export type YieldMarketSnapshot = {
  kaminoApyBps: number;
  poolBaseApyBps: number;
  usdtPriceUsd: number;
  fetchedAt: number;
};

export type AllocationDecision = {
  action: "depositToKamino" | "withdrawFromKamino" | "hold";
  amountUsdt: number;
  targetKaminoAllocationBps: number;
  reason: string;
};

export type AgentRebalancePolicy = {
  agentWallet: PublicKey;
  kaminoProgram: PublicKey;
  maxTransactionAmountUsdt: number;
  privyPolicyId?: string;
  privySignerId?: string;
};

export type IkaRebalancePolicy = AgentRebalancePolicy & {
  dwallet?: PublicKey;
};
