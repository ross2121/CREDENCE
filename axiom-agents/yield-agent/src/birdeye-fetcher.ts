import { YieldMarketSnapshot } from "./types";

export class BirdeyeFetcher {
  constructor(
    private readonly apiKey = process.env.BIRDEYE_API_KEY,
    private readonly fallbackPriceUsd = 1
  ) {}

  async usdtPrice(): Promise<number> {
    if (!this.apiKey) return this.fallbackPriceUsd;
    throw new Error("Birdeye live price fetch is not wired for this demo yet");
  }

  async marketSnapshot(kaminoApyBps: number): Promise<YieldMarketSnapshot> {
    return {
      kaminoApyBps,
      poolBaseApyBps: 0,
      usdtPriceUsd: await this.usdtPrice(),
      fetchedAt: Math.floor(Date.now() / 1000),
    };
  }
}
