import { CreditDecision, CreditFeatures, CreditTier } from "./types";

export type CreditModel = {
  decide(features: CreditFeatures): CreditDecision | Promise<CreditDecision>;
};

export const TIER_CONFIG: Record<
  CreditTier,
  {
    minScore: number;
    maxLoanUsdt: number;
    collateralBps: number;
    interestRateBps: number;
  }
> = {
  bronze: {
    minScore: 400,
    maxLoanUsdt: 500,
    collateralBps: 8_000,
    interestRateBps: 1_800,
  },
  silver: {
    minScore: 600,
    maxLoanUsdt: 2_000,
    collateralBps: 5_000,
    interestRateBps: 1_200,
  },
  gold: {
    minScore: 750,
    maxLoanUsdt: 10_000,
    collateralBps: 2_500,
    interestRateBps: 800,
  },
  platinum: {
    minScore: 900,
    maxLoanUsdt: 50_000,
    collateralBps: 1_000,
    interestRateBps: 500,
  },
};

export class LocalCreditModel implements CreditModel {
  score(features: CreditFeatures): number {
    const raw =
      300 +
      Math.min(features.walletAgeDays / 365, 3) * 55 +
      Math.min(features.averageMonthlyTransactions, 60) +
      Math.min(features.activeMonths, 24) * 4 +
      Math.min(features.defiInteractions, 80) * 1.2 +
      Math.min(Math.max(features.usdtNetFlow, 0) / 1_000, 50) * 2 +
      Math.min(features.averagePortfolioUsd / 1_000, 50) * 2 +
      Math.min(features.crossChainCount, 5) * 20 +
      Math.min(features.collateralPositions, 20) * 4 +
      Math.min(features.priorRepayments, 10) * 10;

    return Math.max(0, Math.min(1000, Math.round(raw)));
  }

  decide(features: CreditFeatures): CreditDecision {
    const score = this.score(features);
    const tier = tierForScore(score);
    const config = TIER_CONFIG[tier];

    return {
      score,
      tier,
      maxLoanUsdt: config.maxLoanUsdt,
      collateralBps: config.collateralBps,
      interestRateBps: config.interestRateBps,
    };
  }
}

export function tierForScore(score: number): CreditTier {
  if (score >= TIER_CONFIG.platinum.minScore) return "platinum";
  if (score >= TIER_CONFIG.gold.minScore) return "gold";
  if (score >= TIER_CONFIG.silver.minScore) return "silver";
  return "bronze";
}
