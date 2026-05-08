"use client";

import { Connection, PublicKey } from "@solana/web3.js";

export const AXIOM_DEVNET = {
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com",
  programId: new PublicKey(
    process.env.NEXT_PUBLIC_AXIOM_PROGRAM_ID ??
      "6Xrd8Ymz9vxecWjifKern6LAzXQ2XKcS4D1zsJ8ENLpK"
  ),
  lendingPool: new PublicKey(
    process.env.NEXT_PUBLIC_AXIOM_LENDING_POOL ??
      "9vWqdDc68HmMijbbDviYmHYPo96Ru2FSL9CYbg22Guiu"
  ),
  usdcVault: new PublicKey(
    process.env.NEXT_PUBLIC_AXIOM_USDC_VAULT ??
      "AaywYs28UTX946bnaXya79GP9X6tj2ScVeb9Z1UHKQa6"
  ),
  kaminoSharesAccount: new PublicKey(
    process.env.NEXT_PUBLIC_AXIOM_KAMINO_SHARES_ACCOUNT ??
      "GnQmmybmEs3gcRcwXRQVGqSGmABK2RRXBhLytTvgj7m"
  ),
  kaminoVault: new PublicKey(
    process.env.NEXT_PUBLIC_KAMINO_VAULT ??
      "7uib8xGAwkaPz4ZGCA6t8sSEid5Yp9ty13PHUweTypx"
  ),
  usdcMint: new PublicKey(
    process.env.NEXT_PUBLIC_USDC_MINT ??
      "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
  ),
};

export type LivePoolState = {
  totalDepositsUsdc: number;
  totalBorrowedUsdc: number;
  utilizationBps: number;
  baseInterestBps: number;
  kaminoAllocationBps: number;
  kaminoAllocatedUsdc: number;
  liquidVaultUsdc: number;
  kaminoShares: number;
  lastRebalance: string;
  lendingPool: string;
  usdcVault: string;
  kaminoSharesAccount: string;
  kaminoVault: string;
};

function readU64(data: Uint8Array, offset: number) {
  return new DataView(data.buffer, data.byteOffset + offset, 8).getBigUint64(
    0,
    true
  );
}

function readI64(data: Uint8Array, offset: number) {
  return new DataView(data.buffer, data.byteOffset + offset, 8).getBigInt64(
    0,
    true
  );
}

function usdc(units: bigint) {
  return Number(units) / 1_000_000;
}

function formatRebalance(unixSeconds: bigint) {
  const timestamp = Number(unixSeconds);
  if (!timestamp) return "Not rebalanced";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp * 1000));
}

async function tokenAmount(connection: Connection, account: PublicKey) {
  const balance = await connection.getTokenAccountBalance(account, "confirmed");
  return Number(balance.value.uiAmount ?? 0);
}

export async function fetchLivePoolState(): Promise<LivePoolState> {
  const connection = new Connection(AXIOM_DEVNET.rpcUrl, "confirmed");
  const [poolAccount, liquidVaultUsdc, kaminoShares] = await Promise.all([
    connection.getAccountInfo(AXIOM_DEVNET.lendingPool, "confirmed"),
    tokenAmount(connection, AXIOM_DEVNET.usdcVault),
    tokenAmount(connection, AXIOM_DEVNET.kaminoSharesAccount),
  ]);

  if (!poolAccount) {
    throw new Error("AXIOM lending pool account was not found on devnet");
  }

  const data = poolAccount.data;
  const totalDeposits = readU64(data, 104);
  const totalBorrowed = readU64(data, 112);
  const utilizationBps = Number(readU64(data, 120));
  const baseInterestBps = Number(readU64(data, 128));
  const kaminoAllocationBps = Number(readU64(data, 136));
  const lastRebalance = readI64(data, 144);

  return {
    totalDepositsUsdc: usdc(totalDeposits),
    totalBorrowedUsdc: usdc(totalBorrowed),
    utilizationBps,
    baseInterestBps,
    kaminoAllocationBps,
    kaminoAllocatedUsdc: usdc(
      (totalDeposits * BigInt(kaminoAllocationBps)) / BigInt(10_000)
    ),
    liquidVaultUsdc,
    kaminoShares,
    lastRebalance: formatRebalance(lastRebalance),
    lendingPool: AXIOM_DEVNET.lendingPool.toBase58(),
    usdcVault: AXIOM_DEVNET.usdcVault.toBase58(),
    kaminoSharesAccount: AXIOM_DEVNET.kaminoSharesAccount.toBase58(),
    kaminoVault: AXIOM_DEVNET.kaminoVault.toBase58(),
  };
}
