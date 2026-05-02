export type TorqueCampaignKind =
  | "lenderIncentive"
  | "borrowerReferral"
  | "goodRepayerAirdrop";

export type TorqueCampaignStatus = "draft" | "created";

export type TorqueMcpConfig = {
  apiKey?: string;
  baseUrl?: string;
  fixture?: TorqueFixture;
  runPrompt?: (prompt: string, apiKey: string) => Promise<TorqueMcpResponse>;
};

export type TorqueMcpResponse = {
  campaignId: string;
  status: TorqueCampaignStatus;
  prompt: string;
};

export type TorqueCampaignDraft = {
  kind: TorqueCampaignKind;
  name: string;
  prompt: string;
  rewardToken: string;
  rewardAmount: number;
  durationDays?: number;
  minDepositUsdt?: number;
  referralReward?: number;
  borrowerCount?: number;
  utilizationBps?: number;
  repaymentRateBps?: number;
};

export type TorqueCampaign = TorqueCampaignDraft & {
  campaignId: string;
  status: TorqueCampaignStatus;
  source: "fixture" | "live";
};

export type TorquePoolMetrics = {
  utilizationBps: number;
  totalDepositsUsdt: number;
  totalBorrowedUsdt: number;
};

export type TorqueRepaymentMetrics = {
  onTimeRateBps: number;
  onTimeBorrowerCount: number;
};

export type TorqueFixture = {
  campaigns: Record<TorqueCampaignKind, TorqueMcpResponse>;
};
