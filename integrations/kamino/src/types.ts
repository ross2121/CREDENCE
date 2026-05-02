import { PublicKey } from "@solana/web3.js";

export type KaminoConfig = {
  usdtMint: PublicKey;
  usdtVault: PublicKey;
  kaminoProgram: PublicKey;
  fallbackApyBps?: number;
  fetchApyBps?: (reserve: PublicKey) => Promise<number>;
};

export type KaminoRoute = {
  reserve: PublicKey;
  usdtVault: PublicKey;
  kaminoProgram: PublicKey;
};

export type KaminoYieldSnapshot = {
  reserve: PublicKey;
  apyBps: number;
  source: "live" | "fallback";
  fetchedAt: number;
};
