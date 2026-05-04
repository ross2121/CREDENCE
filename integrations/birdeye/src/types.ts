export type BirdeyeFixture = {
  prices: Record<string, number>;
  lenderPortfolio: LenderPortfolioStats;
  poolApyHistory: PoolApyPoint[];
};

export type LenderPortfolioStats = {
  wallet: string;
  totalUsd: number;
  suppliedUsdt: number;
  earnedYieldUsd: number;
  activeLoans: number;
};

export type PoolApyPoint = {
  timestamp: number;
  apyBps: number;
  utilizationBps: number;
};

export type LiquidationRiskInput = {
  collateralAmount: number;
  collateralMint: string;
  debtUsdt: number;
  liquidationThresholdBps: number;
};

export type LiquidationRisk = {
  collateralValueUsd: number;
  loanToValueBps: number;
  thresholdBps: number;
  shouldWarn: boolean;
  shouldLiquidate: boolean;
};

export type BirdeyeConfig = {
  apiKey?: string;
  baseUrl?: string;
  fixture?: BirdeyeFixture;
  fetchJson?: (url: string, apiKey: string) => Promise<unknown>;
};
