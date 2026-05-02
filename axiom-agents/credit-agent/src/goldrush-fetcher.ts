import { WalletHistory } from "./types";

export type GoldRushFetcherOptions = {
  apiKey?: string;
  baseUrl?: string;
};

export class GoldRushFetcher {
  constructor(readonly options: GoldRushFetcherOptions = {}) {}

  async fetchWalletHistory(wallet: string): Promise<WalletHistory> {
    if (!this.options.apiKey) {
      return {
        wallet,
        chains: [],
      };
    }

    throw new Error(
      "GoldRush live fetch is not wired in this scaffold; inject fixture history in tests or agent runtime."
    );
  }
}
