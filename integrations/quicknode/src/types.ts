import { PublicKey, Transaction } from "@solana/web3.js";

export type QuickNodeConfig = {
  rpcUrl: string;
  websocketUrl?: string;
  commitment?: "processed" | "confirmed" | "finalized";
};

export type ProgramEvent = {
  signature: string;
  slot: number;
  logs: string[];
};

export type LiquidationWarning = {
  signature: string;
  loan: PublicKey | null;
  borrower: PublicKey | null;
  collateralValueUsd: number | null;
  debtUsdt: number | null;
};

export type SimulationResult = {
  ok: boolean;
  logs: string[];
  error?: string;
};

export type SimulatableConnection = {
  simulateTransaction: (transaction: Transaction) => Promise<{
    value: {
      err: unknown;
      logs: string[] | null;
    };
  }>;
};
