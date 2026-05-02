import { PublicKey } from "@solana/web3.js";
import { AxiomClient } from "../../../sdk/src";
import { KaminoConfig, KaminoRoute, KaminoYieldSnapshot } from "./types";

export class KaminoClient {
  constructor(
    readonly axiom: AxiomClient,
    private readonly config: KaminoConfig
  ) {}

  resolveUsdtRoute(reserve = this.config.usdtMint): KaminoRoute {
    return {
      reserve,
      usdtVault: this.config.usdtVault,
      kaminoProgram: this.config.kaminoProgram,
    };
  }

  depositUsdt(amount: number) {
    if (amount <= 0) throw new Error("Kamino deposit amount must be positive");
    return this.axiom.rebalanceToKamino(Math.floor(amount));
  }

  withdrawUsdt(amount: number) {
    if (amount <= 0) throw new Error("Kamino withdraw amount must be positive");
    return this.axiom.rebalanceFromKamino(Math.floor(amount));
  }

  async apySnapshot(
    reserve = this.config.usdtMint
  ): Promise<KaminoYieldSnapshot> {
    if (this.config.fetchApyBps) {
      return {
        reserve,
        apyBps: await this.config.fetchApyBps(reserve),
        source: "live",
        fetchedAt: nowSeconds(),
      };
    }

    return {
      reserve,
      apyBps: this.config.fallbackApyBps ?? 800,
      source: "fallback",
      fetchedAt: nowSeconds(),
    };
  }
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
