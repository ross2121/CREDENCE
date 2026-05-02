import {
  GoldRushBalance,
  GoldRushPortfolioPoint,
  GoldRushTransfer,
  GoldRushWalletData,
} from "./types";
import {
  ChainActivity,
  WalletHistory,
} from "../../../axiom-agents/credit-agent/src";

const SECONDS_PER_DAY = 86_400;
const MONTH_SECONDS = 30 * SECONDS_PER_DAY;

export function extractWalletHistory(data: GoldRushWalletData): WalletHistory {
  const chains = Array.from(
    new Set([
      ...data.transfers.map((transfer) => transfer.chain),
      ...data.balances.map((balance) => balance.chain),
      ...data.portfolio.map((point) => point.chain),
    ])
  );

  return {
    wallet: data.wallet,
    chains: chains.map((chain) => buildChainActivity(chain, data)),
  };
}

function buildChainActivity(
  chain: string,
  data: GoldRushWalletData
): ChainActivity {
  const transfers = data.transfers.filter(
    (transfer) => transfer.chain === chain
  );
  const portfolio = data.portfolio.filter((point) => point.chain === chain);
  const firstTimestamp = Math.min(
    ...transfers.map((transfer) => transfer.timestamp),
    ...portfolio.map((point) => point.timestamp),
    nowSeconds()
  );

  return {
    chain,
    firstSeenDaysAgo: Math.max(
      0,
      Math.floor((nowSeconds() - firstTimestamp) / SECONDS_PER_DAY)
    ),
    monthlyTransactions: monthlyTransactionCounts(transfers),
    defiInteractions: transfers.filter((transfer) => transfer.protocol).length,
    usdtIncoming: sumUsdt(transfers, "in"),
    usdtOutgoing: sumUsdt(transfers, "out"),
    averagePortfolioUsd: averagePortfolio(portfolio, data.balances, chain),
    collateralPositions: data.collateralPositions[chain] ?? 0,
    repayments: data.repayments[chain] ?? 0,
  };
}

function monthlyTransactionCounts(transfers: GoldRushTransfer[]): number[] {
  if (transfers.length === 0) return [];
  const newest = Math.max(...transfers.map((transfer) => transfer.timestamp));
  const buckets = Array(12).fill(0) as number[];

  for (const transfer of transfers) {
    const bucket = Math.floor((newest - transfer.timestamp) / MONTH_SECONDS);
    if (bucket >= 0 && bucket < buckets.length) buckets[bucket] += 1;
  }

  return buckets.reverse();
}

function sumUsdt(
  transfers: GoldRushTransfer[],
  direction: GoldRushTransfer["direction"]
): number {
  return transfers
    .filter(
      (transfer) =>
        transfer.direction === direction &&
        transfer.tokenSymbol.toUpperCase() === "USDT"
    )
    .reduce((sum, transfer) => sum + transfer.amountUsd, 0);
}

function averagePortfolio(
  portfolio: GoldRushPortfolioPoint[],
  balances: GoldRushBalance[],
  chain: string
): number {
  if (portfolio.length > 0) {
    return (
      portfolio.reduce((sum, point) => sum + point.totalUsd, 0) /
      portfolio.length
    );
  }

  const chainBalances = balances.filter((balance) => balance.chain === chain);
  return chainBalances.reduce((sum, balance) => sum + balance.balanceUsd, 0);
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
