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
};

type AxiomState = {
  activeView: AxiomView;
  demoMode: boolean;
  pool: DemoPool;
  credit: DemoCredit;
  setActiveView: (view: AxiomView) => void;
  toggleDemoMode: () => void;
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
  },
  setActiveView: (activeView) => set({ activeView }),
  toggleDemoMode: () => set((state) => ({ demoMode: !state.demoMode })),
}));
