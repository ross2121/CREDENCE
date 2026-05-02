import { expect } from "chai";
import { readFileSync } from "fs";
import { join } from "path";
import { TorqueMcpClient } from "../integrations/torque/src";

function fixture(name: string) {
  return JSON.parse(
    readFileSync(
      join(process.cwd(), "tests", "fixtures", "torque", name),
      "utf8"
    )
  );
}

describe("Torque MCP integration", () => {
  it("creates lender incentive campaigns when utilization is low", async () => {
    const client = new TorqueMcpClient({
      fixture: fixture("campaigns.json"),
    });

    const campaigns = await client.manageLiquidityCampaigns({
      utilizationBps: 3_500,
      totalDepositsUsdt: 10_000,
      totalBorrowedUsdt: 3_500,
    });

    expect(campaigns).to.have.length(1);
    expect(campaigns[0].kind).to.equal("lenderIncentive");
    expect(campaigns[0].campaignId).to.equal("torque-lender-boost");
    expect(campaigns[0].minDepositUsdt).to.equal(100);
    expect(campaigns[0].prompt).to.contain("50 TORQ per day");
  });

  it("creates borrower referral campaigns when utilization is high", async () => {
    const client = new TorqueMcpClient({
      fixture: fixture("campaigns.json"),
    });

    const campaigns = await client.manageLiquidityCampaigns({
      utilizationBps: 9_000,
      totalDepositsUsdt: 10_000,
      totalBorrowedUsdt: 9_000,
    });

    expect(campaigns).to.have.length(1);
    expect(campaigns[0].kind).to.equal("borrowerReferral");
    expect(campaigns[0].campaignId).to.equal("torque-borrower-referral");
    expect(campaigns[0].referralReward).to.equal(25);
  });

  it("builds a good-repayer airdrop from repayment metrics", async () => {
    const client = new TorqueMcpClient({
      fixture: fixture("campaigns.json"),
    });
    const draft = client.goodRepayerAirdrop({
      onTimeRateBps: 9_700,
      onTimeBorrowerCount: 42,
    });

    expect(draft).to.not.equal(null);
    const campaign = await client.createCampaign(draft!);

    expect(campaign.kind).to.equal("goodRepayerAirdrop");
    expect(campaign.campaignId).to.equal("torque-good-repayer-airdrop");
    expect(campaign.borrowerCount).to.equal(42);
    expect(campaign.prompt).to.contain("42 AXIOM borrowers");
  });

  it("does not create campaigns when metrics are inside neutral bands", async () => {
    const client = new TorqueMcpClient({
      fixture: fixture("campaigns.json"),
    });

    expect(
      await client.manageLiquidityCampaigns({
        utilizationBps: 6_000,
        totalDepositsUsdt: 10_000,
        totalBorrowedUsdt: 6_000,
      })
    ).to.have.length(0);
    expect(
      client.goodRepayerAirdrop({
        onTimeRateBps: 9_000,
        onTimeBorrowerCount: 12,
      })
    ).to.equal(null);
  });

  it("requires an API key and transport for live MCP requests", async () => {
    const client = new TorqueMcpClient({ apiKey: "" });
    const draft = client.lenderIncentiveCampaign({
      utilizationBps: 3_000,
      totalDepositsUsdt: 10_000,
      totalBorrowedUsdt: 3_000,
    });

    try {
      await client.createCampaign(draft!);
      throw new Error("expected request to fail");
    } catch (error) {
      expect((error as Error).message).to.contain("TORQUE_API_KEY");
    }
  });
});
