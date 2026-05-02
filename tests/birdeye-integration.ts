import { expect } from "chai";
import { readFileSync } from "fs";
import { join } from "path";
import { BirdeyeClient } from "../integrations/birdeye/src";

function fixture(name: string) {
  return JSON.parse(
    readFileSync(
      join(process.cwd(), "tests", "fixtures", "birdeye", name),
      "utf8"
    )
  );
}

describe("Birdeye integration", () => {
  it("fetches collateral token prices from fixtures", async () => {
    const client = new BirdeyeClient({ fixture: fixture("market.json") });

    expect(await client.tokenPrice("SOL")).to.equal(150);
    expect(await client.tokenPrice("JUP")).to.equal(1.25);
  });

  it("fetches lender portfolio stats and pool APY history", async () => {
    const client = new BirdeyeClient({ fixture: fixture("market.json") });
    const portfolio = await client.lenderPortfolio("lender-wallet");
    const history = await client.poolApyHistory();

    expect(portfolio.suppliedUsdt).to.equal(12_000);
    expect(portfolio.activeLoans).to.equal(4);
    expect(history).to.have.length(2);
    expect(history[1].apyBps).to.equal(760);
  });

  it("computes liquidation warning risk from collateral price", async () => {
    const client = new BirdeyeClient({ fixture: fixture("market.json") });
    const risk = await client.liquidationRisk({
      collateralAmount: 10,
      collateralMint: "SOL",
      debtUsdt: 1_100,
      liquidationThresholdBps: 8_000,
    });

    expect(risk.collateralValueUsd).to.equal(1_500);
    expect(risk.loanToValueBps).to.equal(7_333);
    expect(risk.shouldWarn).to.equal(false);
    expect(risk.shouldLiquidate).to.equal(false);
  });

  it("requires API key and transport for live requests", async () => {
    const client = new BirdeyeClient({ apiKey: "" });

    try {
      await client.tokenPrice("SOL");
      throw new Error("expected request to fail");
    } catch (error) {
      expect((error as Error).message).to.contain("BIRDEYE_API_KEY");
    }
  });
});
