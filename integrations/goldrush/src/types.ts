import { WalletHistory } from "../../../axiom-agents/credit-agent/src";

export type GoldRushTransfer = {
  chain: string;
  tokenSymbol: string;
  direction: "in" | "out";
  amountUsd: number;
  timestamp: number;
  protocol?: string;
};

export type GoldRushBalance = {
  chain: string;
  tokenSymbol: string;
  balanceUsd: number;
};

export type GoldRushPortfolioPoint = {
  chain: string;
  timestamp: number;
  totalUsd: number;
};

export type GoldRushWalletData = {
  wallet: string;
  transfers: GoldRushTransfer[];
  balances: GoldRushBalance[];
  portfolio: GoldRushPortfolioPoint[];
  collateralPositions: Record<string, number>;
  repayments: Record<string, number>;
};

export type GoldRushClientConfig = {
  apiKey?: string;
  baseUrl?: string;
  fetchJson?: (path: string, apiKey: string) => Promise<unknown>;
  fixture?: GoldRushWalletData;
};

export type GoldRushCreditData = {
  raw: GoldRushWalletData;
  walletHistory: WalletHistory;
};
