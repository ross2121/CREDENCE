"use client";

import { create } from "zustand";

type AxiomView = "borrow" | "lend" | "analytics";

type PoolFallback = {
  totalDepositsUsdt: number;
  totalBorrowedUsdt: number;
  kaminoAllocationUsdt: number;
  poolApyBps: number;
};

type CreditFallback = {
  tier: "Bronze";
  maxLoanUsdt: number;
  collateralRequiredBps: number;
  proofStatus: "not registered";
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
  status: "None";
};

type RepaymentStream = {
  fundedUsdt: number;
  accruedUsdt: number;
  nextClaimUsdt: number;
  healthBps: number;
};

type LenderAction = {
  amountUsdt: number;
};

type YieldAllocation = {
  axiomPoolUsdt: number;
  kaminoUsdt: number;
  borrowerInterestApyBps: number;
  lastRebalance: string;
};

type AxiomState = {
  activeView: AxiomView;
  pool: PoolFallback;
  credit: CreditFallback;
  loanRequest: BorrowerLoanRequest;
  activeLoan: ActiveLoan;
  repaymentStream: RepaymentStream;
  lenderAction: LenderAction;
  yieldAllocation: YieldAllocation;
  setActiveView: (view: AxiomView) => void;
  updateLoanRequest: (request: Partial<BorrowerLoanRequest>) => void;
  updateLenderAction: (action: Partial<LenderAction>) => void;
};

export const useAxiomStore = create<AxiomState>((set) => ({
  activeView: "borrow",
  pool: {
    totalDepositsUsdt: 0,
    totalBorrowedUsdt: 0,
    kaminoAllocationUsdt: 0,
    poolApyBps: 0,
  },
  credit: {
    tier: "Bronze",
    maxLoanUsdt: 0,
    collateralRequiredBps: 0,
    proofStatus: "not registered",
    score: 0,
    modelHash: "Not registered",
    walletHash: "Not registered",
    expiresAt: "Not registered",
  },
  loanRequest: {
    principalUsdt: 100,
    durationDays: 60,
    collateralUsdt: 25,
  },
  activeLoan: {
    principalUsdt: 0,
    repaidUsdt: 0,
    apyBps: 0,
    dueDate: "No active loan",
    status: "None",
  },
  repaymentStream: {
    fundedUsdt: 0,
    accruedUsdt: 0,
    nextClaimUsdt: 0,
    healthBps: 0,
  },
  lenderAction: {
    amountUsdt: 1,
  },
  yieldAllocation: {
    axiomPoolUsdt: 0,
    kaminoUsdt: 0,
    borrowerInterestApyBps: 0,
    lastRebalance: "Not rebalanced",
  },
  setActiveView: (activeView) => set({ activeView }),
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
  updateLenderAction: (action) =>
    set((state) => ({
      lenderAction: { ...state.lenderAction, ...action },
    })),
}));
