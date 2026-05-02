import { PublicKey } from "@solana/web3.js";
import { AxiomClient } from "../../../sdk/src";
import { PoolSnapshot } from "./types";

type RawPoolAccount = {
  usdtVault: PublicKey;
  kaminoVault: PublicKey;
  totalDeposits: unknown;
  totalBorrowed: unknown;
  kaminoAllocation: unknown;
  lastRebalance: unknown;
};

export class PoolMonitor {
  constructor(readonly client: AxiomClient) {}

  async snapshot(usdtVault: PublicKey): Promise<PoolSnapshot> {
    const [lendingPool] = this.client.deriveLendingPool(usdtVault);
    const account = (await this.client.program.account.lendingPool.fetch(
      lendingPool
    )) as RawPoolAccount;

    const totalDeposits = toNumber(account.totalDeposits);
    const totalBorrowed = toNumber(account.totalBorrowed);
    const kaminoAllocationBps = toNumber(account.kaminoAllocation);
    const kaminoAllocatedUsdt = Math.floor(
      (totalDeposits * kaminoAllocationBps) / 10_000
    );

    return {
      lendingPool,
      usdtVault: account.usdtVault,
      kaminoVault: account.kaminoVault,
      liquidUsdt: Math.max(
        totalDeposits - totalBorrowed - kaminoAllocatedUsdt,
        0
      ),
      totalDeposits,
      totalBorrowed,
      kaminoAllocatedUsdt,
      kaminoAllocationBps,
      lastRebalance: toNumber(account.lastRebalance),
    };
  }
}

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (value && typeof value === "object" && "toString" in value) {
    return Number(value.toString());
  }
  return Number(value);
}
