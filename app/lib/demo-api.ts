export type DemoRequestState = "loading" | "empty" | "error" | "success";

export const demoSeed = "axiom-frontier-demo-2026-05-03";

export const demoApi = {
  borrower: {
    state: "success" as DemoRequestState,
    message: "Credit proof fixture loaded from deterministic demo data.",
  },
  lender: {
    state: "loading" as DemoRequestState,
    message: "Streaming pool and Kamino allocation from mocked QuickNode data.",
  },
  analytics: {
    state: "empty" as DemoRequestState,
    message: "No live API keys detected; using local analytics fixtures.",
  },
  liquidation: {
    state: "error" as DemoRequestState,
    message: "Birdeye live liquidation monitor is offline in no-key demo mode.",
  },
};
