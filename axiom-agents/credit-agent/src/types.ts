export type ChainActivity = {
  chain: string;
  firstSeenDaysAgo: number;
  monthlyTransactions: number[];
  defiInteractions: number;
  usdtIncoming: number;
  usdtOutgoing: number;
  averagePortfolioUsd: number;
  collateralPositions: number;
  repayments: number;
};

export type WalletHistory = {
  wallet: string;
  chains: ChainActivity[];
};

export type CreditFeatures = {
  walletAgeDays: number;
  averageMonthlyTransactions: number;
  activeMonths: number;
  defiInteractions: number;
  usdtNetFlow: number;
  averagePortfolioUsd: number;
  crossChainCount: number;
  collateralPositions: number;
  priorRepayments: number;
};

export type CreditTier = "bronze" | "silver" | "gold" | "platinum";

export type CreditDecision = {
  score: number;
  tier: CreditTier;
  maxLoanUsdt: number;
  collateralBps: number;
  interestRateBps: number;
};

export type ProofRequest = {
  wallet: string;
  decision: CreditDecision;
  walletHash: string;
  modelHash: string;
};

export type GeneratedCreditProof = {
  proof: number[];
  publicSignals: string[];
  publicInputs: number[][];
  expiresAt: number;
};
