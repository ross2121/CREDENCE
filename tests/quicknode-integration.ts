import { expect } from "chai";
import { readFileSync } from "fs";
import { join } from "path";
import { Transaction } from "@solana/web3.js";
import {
  parseLiquidationWarning,
  QuickNodeClient,
} from "../integrations/quicknode/src";

function fixture(name: string) {
  return JSON.parse(
    readFileSync(
      join(process.cwd(), "tests", "fixtures", "quicknode", name),
      "utf8"
    )
  );
}

describe("QuickNode integration", () => {
  it("parses liquidation warning logs", () => {
    const warning = parseLiquidationWarning(fixture("logs.json"));

    expect(warning?.signature).to.contain("5mPrQ3");
    expect(warning?.collateralValueUsd).to.equal(900);
    expect(warning?.debtUsdt).to.equal(850);
  });

  it("simulates transactions through an injected connection", async () => {
    const client = new QuickNodeClient({
      rpcUrl: "https://example.quicknode.pro/demo",
      websocketUrl: "wss://example.quicknode.pro/demo",
    });
    const result = await client.simulate(new Transaction(), {
      simulateTransaction: async () => ({
        value: {
          err: null,
          logs: ["simulation ok"],
        },
      }),
    });

    expect(result.ok).to.equal(true);
    expect(result.logs).to.deep.equal(["simulation ok"]);
  });

  it("surfaces simulation errors", async () => {
    const client = new QuickNodeClient({
      rpcUrl: "https://example.quicknode.pro/demo",
    });
    const result = await client.simulate(new Transaction(), {
      simulateTransaction: async () => ({
        value: {
          err: { InstructionError: [0, "Custom"] },
          logs: ["failed"],
        },
      }),
    });

    expect(result.ok).to.equal(false);
    expect(result.error).to.contain("InstructionError");
  });
});
