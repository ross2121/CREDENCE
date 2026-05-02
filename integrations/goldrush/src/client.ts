import { extractWalletHistory } from "./extractor";
import {
  GoldRushClientConfig,
  GoldRushCreditData,
  GoldRushWalletData,
} from "./types";

export class GoldRushClient {
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly fetchJson?: (
    path: string,
    apiKey: string
  ) => Promise<unknown>;
  private readonly fixture?: GoldRushWalletData;

  constructor(config: GoldRushClientConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.GOLDRUSH_API_KEY;
    this.baseUrl = config.baseUrl ?? "https://api.covalenthq.com/v1";
    this.fetchJson = config.fetchJson;
    this.fixture = config.fixture;
  }

  static fromFixture(fixture: GoldRushWalletData) {
    return new GoldRushClient({ fixture });
  }

  async creditData(wallet: string): Promise<GoldRushCreditData> {
    const raw = this.fixture ?? (await this.fetchWalletData(wallet));
    return {
      raw,
      walletHistory: extractWalletHistory(raw),
    };
  }

  async solanaTransactions(wallet: string) {
    return this.request(`/solana-mainnet/address/${wallet}/transactions_v3/`);
  }

  async crossChainBalances(wallet: string) {
    return this.request(`/address/${wallet}/balances_v2/`);
  }

  async historicalPortfolio(wallet: string) {
    return this.request(`/address/${wallet}/portfolio_v2/`);
  }

  private async fetchWalletData(wallet: string): Promise<GoldRushWalletData> {
    await Promise.all([
      this.solanaTransactions(wallet),
      this.crossChainBalances(wallet),
      this.historicalPortfolio(wallet),
    ]);

    throw new Error(
      "GoldRush live response mapping is not wired; use fixtures or add a fetchJson mapper"
    );
  }

  private async request(path: string): Promise<unknown> {
    if (!this.apiKey) {
      throw new Error(
        "GOLDRUSH_API_KEY is required for live GoldRush requests"
      );
    }
    if (!this.fetchJson) {
      throw new Error(
        "GoldRushClient requires fetchJson for live API requests"
      );
    }

    return this.fetchJson(`${this.baseUrl}${path}`, this.apiKey);
  }
}
