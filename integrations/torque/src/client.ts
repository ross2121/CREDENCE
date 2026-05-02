import {
  TorqueCampaign,
  TorqueCampaignDraft,
  TorqueFixture,
  TorqueMcpConfig,
  TorqueMcpResponse,
  TorquePoolMetrics,
  TorqueRepaymentMetrics,
} from "./types";

export class TorqueMcpClient {
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly fixture?: TorqueFixture;
  private readonly runPrompt?: (
    prompt: string,
    apiKey: string
  ) => Promise<TorqueMcpResponse>;

  constructor(config: TorqueMcpConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.TORQUE_API_KEY;
    this.baseUrl = config.baseUrl ?? "https://mcp.torque.so";
    this.fixture = config.fixture;
    this.runPrompt = config.runPrompt;
  }

  async createCampaign(draft: TorqueCampaignDraft): Promise<TorqueCampaign> {
    const response = await this.run(draft);

    return {
      ...draft,
      campaignId: response.campaignId,
      status: response.status,
      source: this.fixture ? "fixture" : "live",
    };
  }

  lenderIncentiveCampaign(
    metrics: TorquePoolMetrics
  ): TorqueCampaignDraft | null {
    if (metrics.utilizationBps >= 4_000) return null;

    return {
      kind: "lenderIncentive",
      name: "AXIOM low-utilization lender boost",
      rewardToken: "TORQ",
      rewardAmount: 50,
      durationDays: 7,
      minDepositUsdt: 100,
      utilizationBps: metrics.utilizationBps,
      prompt:
        "Create a 7-day campaign rewarding AXIOM lenders who deposit at least 100 USDT with 50 TORQ per day.",
    };
  }

  borrowerReferralCampaign(
    metrics: TorquePoolMetrics
  ): TorqueCampaignDraft | null {
    if (metrics.utilizationBps <= 8_500) return null;

    return {
      kind: "borrowerReferral",
      name: "AXIOM high-utilization borrower referrals",
      rewardToken: "TORQ",
      rewardAmount: 25,
      referralReward: 25,
      utilizationBps: metrics.utilizationBps,
      prompt:
        "Create a borrower referral campaign awarding 25 TORQ for every referred borrower who successfully takes an AXIOM loan.",
    };
  }

  goodRepayerAirdrop(
    metrics: TorqueRepaymentMetrics
  ): TorqueCampaignDraft | null {
    if (metrics.onTimeRateBps <= 9_500 || metrics.onTimeBorrowerCount <= 0) {
      return null;
    }

    return {
      kind: "goodRepayerAirdrop",
      name: "AXIOM good repayer airdrop",
      rewardToken: "TORQ",
      rewardAmount: 10,
      borrowerCount: metrics.onTimeBorrowerCount,
      repaymentRateBps: metrics.onTimeRateBps,
      prompt: `Airdrop 10 TORQ to all ${metrics.onTimeBorrowerCount} AXIOM borrowers who repaid on time this month.`,
    };
  }

  async manageLiquidityCampaigns(
    metrics: TorquePoolMetrics
  ): Promise<TorqueCampaign[]> {
    const drafts = [
      this.lenderIncentiveCampaign(metrics),
      this.borrowerReferralCampaign(metrics),
    ].filter((draft): draft is TorqueCampaignDraft => draft !== null);

    return Promise.all(drafts.map((draft) => this.createCampaign(draft)));
  }

  private async run(draft: TorqueCampaignDraft): Promise<TorqueMcpResponse> {
    const fixtureResponse = this.fixture?.campaigns[draft.kind];
    if (fixtureResponse) {
      return {
        ...fixtureResponse,
        prompt: draft.prompt,
      };
    }

    if (!this.apiKey) {
      throw new Error("TORQUE_API_KEY is required for live Torque MCP requests");
    }
    if (!this.runPrompt) {
      throw new Error("TorqueMcpClient requires runPrompt for live MCP requests");
    }

    return this.runPrompt(`${this.baseUrl}: ${draft.prompt}`, this.apiKey);
  }
}
