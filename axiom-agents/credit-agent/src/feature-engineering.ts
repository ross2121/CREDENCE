import { CreditFeatures, WalletHistory } from "./types";

export function buildFeatureVector(history: WalletHistory): CreditFeatures {
  const chains = history.chains;
  const monthlyCounts = chains.flatMap((chain) => chain.monthlyTransactions);
  const totalPortfolio = chains.reduce(
    (sum, chain) => sum + chain.averagePortfolioUsd,
    0
  );

  return {
    walletAgeDays: Math.max(
      0,
      ...chains.map((chain) => chain.firstSeenDaysAgo)
    ),
    averageMonthlyTransactions:
      monthlyCounts.length === 0
        ? 0
        : monthlyCounts.reduce((sum, count) => sum + count, 0) /
          monthlyCounts.length,
    activeMonths: monthlyCounts.filter((count) => count > 0).length,
    defiInteractions: chains.reduce(
      (sum, chain) => sum + chain.defiInteractions,
      0
    ),
    usdtNetFlow: chains.reduce(
      (sum, chain) => sum + chain.usdtIncoming - chain.usdtOutgoing,
      0
    ),
    averagePortfolioUsd:
      chains.length === 0 ? 0 : totalPortfolio / chains.length,
    crossChainCount: chains.filter(
      (chain) => chain.monthlyTransactions.length > 0
    ).length,
    collateralPositions: chains.reduce(
      (sum, chain) => sum + chain.collateralPositions,
      0
    ),
    priorRepayments: chains.reduce((sum, chain) => sum + chain.repayments, 0),
  };
}
