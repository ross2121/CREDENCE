import {
  BirdeyeConfig,
  BirdeyeFixture,
  LenderPortfolioStats,
  LiquidationRisk,
  LiquidationRiskInput,
  PoolApyPoint,
} from "./types";

export class BirdeyeClient {
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly fixture?: BirdeyeFixture;
  private readonly fetchJson: (url: string, apiKey: string) => Promise<unknown>;

  constructor(config: BirdeyeConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.BIRDEYE_API_KEY;
    this.baseUrl = config.baseUrl ?? "https://public-api.birdeye.so";
    this.fixture = config.fixture;
    this.fetchJson = config.fetchJson ?? defaultFetchJson;
  }

  async tokenPrice(mint: string): Promise<number> {
    const fixturePrice = this.fixture?.prices[mint];
    if (fixturePrice !== undefined) return fixturePrice;

    const response = await this.request(`/defi/price?address=${mint}`);
    return Number((response as any).data?.value);
  }

  async lenderPortfolio(wallet: string): Promise<LenderPortfolioStats> {
    if (this.fixture?.lenderPortfolio.wallet === wallet) {
      return this.fixture.lenderPortfolio;
    }

    const response = await this.request(
      `/v1/wallet/token_list?wallet=${wallet}`
    );
    return {
      wallet,
      totalUsd: Number((response as any).data?.totalUsd ?? 0),
      suppliedUsdt: 0,
      earnedYieldUsd: 0,
      activeLoans: 0,
    };
  }

  async poolApyHistory(): Promise<PoolApyPoint[]> {
    if (this.fixture) return this.fixture.poolApyHistory;

    const response = await this.request("/defi/pool_apy");
    return ((response as any).data?.items ?? []) as PoolApyPoint[];
  }

  async liquidationRisk(input: LiquidationRiskInput): Promise<LiquidationRisk> {
    const price = await this.tokenPrice(input.collateralMint);
    const collateralValueUsd = input.collateralAmount * price;
    const loanToValueBps =
      collateralValueUsd === 0
        ? 10_000
        : Math.floor((input.debtUsdt * 10_000) / collateralValueUsd);

    return {
      collateralValueUsd,
      loanToValueBps,
      thresholdBps: input.liquidationThresholdBps,
      shouldWarn: loanToValueBps >= input.liquidationThresholdBps - 500,
      shouldLiquidate: loanToValueBps >= input.liquidationThresholdBps,
    };
  }

  private async request(path: string): Promise<unknown> {
    if (!this.apiKey) {
      throw new Error("BIRDEYE_API_KEY is required for live Birdeye requests");
    }
    return this.fetchJson(`${this.baseUrl}${path}`, this.apiKey);
  }
}

async function defaultFetchJson(url: string, apiKey: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "x-api-key": apiKey,
      "x-chain": "solana",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Birdeye request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}
