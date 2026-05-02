import { expect } from "chai";
import { readFileSync } from "fs";
import { join } from "path";
import { PublicKey } from "@solana/web3.js";
import { AxiomClient } from "../sdk/src";
import { KaminoClient } from "../integrations/kamino/src";

function fixture(name: string) {
  return JSON.parse(
    readFileSync(
      join(process.cwd(), "tests", "fixtures", "kamino", name),
      "utf8"
    )
  );
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
      rebalanceToKamino: method("rebalanceToKamino"),
      rebalanceFromKamino: method("rebalanceFromKamino"),
    },
  } as any;
}

describe("Kamino integration", () => {
  it("resolves the configured USDT route", () => {
    const program = mockProgram();
    const usdtMint = PublicKey.unique();
    const usdtVault = PublicKey.unique();
    const kaminoProgram = PublicKey.unique();
    const kamino = new KaminoClient(new AxiomClient(program), {
      usdtMint,
      usdtVault,
      kaminoProgram,
    });

    expect(kamino.resolveUsdtRoute()).to.deep.equal({
      reserve: usdtMint,
      usdtVault,
      kaminoProgram,
    });
  });

  it("builds deposit and withdrawal rebalance helpers", () => {
    const data = fixture("route.json");
    const program = mockProgram();
    const kamino = new KaminoClient(new AxiomClient(program), {
      usdtMint: PublicKey.unique(),
      usdtVault: PublicKey.unique(),
      kaminoProgram: PublicKey.unique(),
    });

    kamino.depositUsdt(data.depositAmount);
    kamino.withdrawUsdt(data.withdrawAmount);

    expect(program.calls.map((call) => call[0])).to.deep.equal([
      "rebalanceToKamino",
      "rebalanceFromKamino",
    ]);
  });

  it("uses fallback APY for deterministic demos", async () => {
    const data = fixture("route.json");
    const kamino = new KaminoClient(new AxiomClient(mockProgram()), {
      usdtMint: PublicKey.unique(),
      usdtVault: PublicKey.unique(),
      kaminoProgram: PublicKey.unique(),
      fallbackApyBps: data.fallbackApyBps,
    });

    const snapshot = await kamino.apySnapshot();

    expect(snapshot.apyBps).to.equal(875);
    expect(snapshot.source).to.equal("fallback");
  });
});
