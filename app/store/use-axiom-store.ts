"use client";

import { create } from "zustand";

type AxiomView = "borrow" | "lend" | "analytics";

type DemoPool = {
  totalDepositsUsdt: number;
  totalBorrowedUsdt: number;
  kaminoAllocationUsdt: number;
  poolApyBps: number;
};

type DemoCredit = {
  tier: "Gold";
  maxLoanUsdt: number;
  collateralRequiredBps: number;
  proofStatus: "ready";
  score: number;
  modelHash: string;
  walletHash: string;
  expiresAt: string;
};

type BorrowerLoanRequest = {
  principalUsdt: number;
  durationDays: number;
  collateralUsdt: number;
};

type ActiveLoan = {
  principalUsdt: number;
  repaidUsdt: number;
  apyBps: number;
  dueDate: string;
  status: "Streaming";
};

type RepaymentStream = {
  fundedUsdt: number;
  accruedUsdt: number;
  nextClaimUsdt: number;
  healthBps: number;
};

type AxiomState = {
  activeView: AxiomView;
  demoMode: boolean;
  pool: DemoPool;
  credit: DemoCredit;
  loanRequest: BorrowerLoanRequest;
  activeLoan: ActiveLoan;
  repaymentStream: RepaymentStream;
  setActiveView: (view: AxiomView) => void;
  toggleDemoMode: () => void;
  updateLoanRequest: (request: Partial<BorrowerLoanRequest>) => void;
};

export const useAxiomStore = create<AxiomState>((set) => ({
  activeView: "borrow",
  demoMode: true,
  pool: {
    totalDepositsUsdt: 128_000,
    totalBorrowedUsdt: 84_500,
    kaminoAllocationUsdt: 22_000,
    poolApyBps: 970,
  },
  credit: {
    tier: "Gold",
    maxLoanUsdt: 12_500,
    collateralRequiredBps: 2_500,
    proofStatus: "ready",
    score: 742,
    modelHash: "qvac-credit-v1:8f31",
    walletHash: "wallet:4c9a...d12e",
    expiresAt: "May 10, 2026",
  },
  loanRequest: {
    principalUsdt: 7_500,
    durationDays: 60,
    collateralUsdt: 1_875,
  },
  activeLoan: {
    principalUsdt: 7_500,
    repaidUsdt: 2_180,
    apyBps: 1_180,
    dueDate: "June 18, 2026",
    status: "Streaming",
  },
  repaymentStream: {
    fundedUsdt: 2_600,
    accruedUsdt: 2_180,
    nextClaimUsdt: 92,
    healthBps: 11_900,
  },
  setActiveView: (activeView) => set({ activeView }),
  toggleDemoMode: () => set((state) => ({ demoMode: !state.demoMode })),
  updateLoanRequest: (request) =>
    set((state) => {
      const next = { ...state.loanRequest, ...request };
      return {
        loanRequest: {
          ...next,
          collateralUsdt: Math.ceil(
            (next.principalUsdt * state.credit.collateralRequiredBps) / 10_000
          ),
        },
      };
    }),
}));
