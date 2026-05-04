import { BirdeyeClient } from "../../../integrations/birdeye/src";
import { YieldMarketSnapshot } from "./types";

const SOLANA_USDT_MINT =
  process.env.USDT_MINT ?? "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

export class BirdeyeFetcher {
  private readonly client: BirdeyeClient;
  private readonly hasLiveApiKey: boolean;

  constructor(
    apiKey = process.env.BIRDEYE_API_KEY,
    private readonly fallbackPriceUsd = 1,
    private readonly usdtMint = SOLANA_USDT_MINT,
    client?: BirdeyeClient
  ) {
    this.hasLiveApiKey = Boolean(apiKey);
    this.client = client ?? new BirdeyeClient({ apiKey });
  }

  async usdtPrice(): Promise<number> {
    if (!this.hasLiveApiKey) return this.fallbackPriceUsd;
    return this.client.tokenPrice(this.usdtMint);
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
