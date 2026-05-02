import { expect } from "chai";
import { readFileSync } from "fs";
import { join } from "path";
import { buildFeatureVector } from "../axiom-agents/credit-agent/src";
import {
  extractWalletHistory,
  GoldRushClient,
} from "../integrations/goldrush/src";

function fixture(name: string) {
  return JSON.parse(
    readFileSync(
      join(process.cwd(), "tests", "fixtures", "goldrush", name),
      "utf8"
    )
  );
}

describe("GoldRush integration", () => {
  it("extracts credit wallet history from GoldRush fixture data", () => {
    const history = extractWalletHistory(fixture("wallet-credit.json"));
    const solana = history.chains.find(
      (chain) => chain.chain === "solana-mainnet"
    );
    const base = history.chains.find((chain) => chain.chain === "base-mainnet");

    expect(history.wallet).to.equal("goldrush-wallet");
    expect(history.chains).to.have.length(2);
    expect(solana?.usdtIncoming).to.equal(12_000);
    expect(solana?.usdtOutgoing).to.equal(7_000);
    expect(solana?.defiInteractions).to.equal(3);
    expect(base?.averagePortfolioUsd).to.equal(7_500);
  });

  it("feeds normalized history into credit feature engineering", async () => {
    const client = GoldRushClient.fromFixture(fixture("wallet-credit.json"));
    const { walletHistory } = await client.creditData("goldrush-wallet");
    const features = buildFeatureVector(walletHistory);

    expect(features.crossChainCount).to.equal(2);
    expect(features.usdtNetFlow).to.equal(7_500);
    expect(features.collateralPositions).to.equal(4);
    expect(features.priorRepayments).to.equal(3);
  });

  it("requires an API key and transport for live requests", async () => {
    const client = new GoldRushClient({ apiKey: "" });

    try {
      await client.solanaTransactions("wallet");
      throw new Error("expected request to fail");
    } catch (error) {
      expect((error as Error).message).to.contain("GOLDRUSH_API_KEY");
    }
  });
});
