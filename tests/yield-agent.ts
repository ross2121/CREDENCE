import { expect } from "chai";
import { readFileSync } from "fs";
import { join } from "path";
import { PublicKey } from "@solana/web3.js";
import { AxiomClient } from "../sdk/src";
import {
  BirdeyeFetcher,
  KaminoApyMonitor,
  PoolSnapshot,
  YieldAgent,
  YieldStrategy,
} from "../axiom-agents/yield-agent/src";

function fixture(name: string) {
  return JSON.parse(
    readFileSync(
      join(process.cwd(), "tests", "fixtures", "yield-agent", name),
      "utf8"
    )
  );
}

function pool(data: any): PoolSnapshot {
  return {
    lendingPool: PublicKey.unique(),
    usdtVault: PublicKey.unique(),
    kaminoVault: PublicKey.unique(),
    liquidUsdt: data.liquidUsdt,
    totalDeposits: data.totalDeposits,
    totalBorrowed: data.totalBorrowed,
    kaminoAllocatedUsdt: data.kaminoAllocatedUsdt,
    kaminoAllocationBps: data.kaminoAllocationBps,
    lastRebalance: data.lastRebalance,
  };
}

function mockProgram() {
  const calls: unknown[][] = [];
  const method =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, ...args]);
      return { name, args };
    };

  return {
    calls,
    programId: PublicKey.unique(),
    methods: {
      verifyIkaPolicy: method("verifyIkaPolicy"),
      rebalanceToKamino: method("rebalanceToKamino"),
      rebalanceFromKamino: method("rebalanceFromKamino"),
    },
  } as any;
}

describe("YieldAgent", () => {
  it("deposits idle liquidity into Kamino on low utilization", () => {
    const data = fixture("low-utilization.json");
    const decision = new YieldStrategy().decide(pool(data), data.market);

    expect(decision.action).to.equal("depositToKamino");
    expect(decision.amountUsdt).to.equal(2500);
    expect(decision.targetKaminoAllocationBps).to.equal(4500);
  });

  it("withdraws from Kamino when utilization is high", () => {
    const data = fixture("high-utilization.json");
    const decision = new YieldStrategy().decide(pool(data), data.market);

    expect(decision.action).to.equal("withdrawFromKamino");
    expect(decision.amountUsdt).to.equal(2000);
    expect(decision.targetKaminoAllocationBps).to.equal(0);
  });

  it("builds agent policy check and rebalance SDK calls", () => {
    const agent = new YieldAgent();
    const data = fixture("low-utilization.json");
    const decision = agent.decide(pool(data), data.market);
    const program = mockProgram();
    const client = new AxiomClient(program);

    const txs = agent.buildRebalanceTransactions(client, decision, {
      agentWallet: PublicKey.unique(),
      kaminoProgram: PublicKey.unique(),
      maxTransactionAmountUsdt: 5_000,
    });

    expect(txs).to.have.length(2);
    expect(program.calls.map((call) => call[0])).to.deep.equal([
      "verifyIkaPolicy",
      "rebalanceToKamino",
    ]);
  });

  it("uses offline monitor fallbacks for demo reliability", async () => {
    const kamino = await new KaminoApyMonitor(777).snapshot();
    const market = await new BirdeyeFetcher(undefined, 0.999).marketSnapshot(
      kamino.kaminoApyBps
    );

    expect(market.kaminoApyBps).to.equal(777);
    expect(market.usdtPriceUsd).to.equal(0.999);
  });

  it("fetches live Birdeye price through the injected client", async () => {
    const previousApiKey = process.env.BIRDEYE_API_KEY;
    process.env.BIRDEYE_API_KEY = "test-key";
    const client = {
      tokenPrice: async (mint: string) => {
        expect(mint).to.equal("usdt-mint");
        return 1.001;
      },
    };

    try {
      const market = await new BirdeyeFetcher(
        "test-key",
        1,
        "usdt-mint",
        client as any
      ).marketSnapshot(888);

      expect(market.kaminoApyBps).to.equal(888);
      expect(market.usdtPriceUsd).to.equal(1.001);
    } finally {
      if (previousApiKey === undefined) {
        delete process.env.BIRDEYE_API_KEY;
      } else {
        process.env.BIRDEYE_API_KEY = previousApiKey;
      }
    }
  });
});
