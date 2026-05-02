import { CreditDecision, CreditFeatures, CreditTier } from "./types";
import { CreditModel, LocalCreditModel, TIER_CONFIG } from "./model";

type QvacSdk = typeof import("@qvac/sdk");

export type QvacCreditModelOptions = {
  enabled?: boolean;
  requireQvac?: boolean;
  modelConstant?: string;
  contextSize?: number;
};

export class QvacCreditModel implements CreditModel {
  private readonly fallback = new LocalCreditModel();

  constructor(readonly options: QvacCreditModelOptions = {}) {}

  static fromEnv() {
    return new QvacCreditModel({
      enabled: process.env.AXIOM_QVAC_ENABLED === "true",
      requireQvac: process.env.AXIOM_QVAC_REQUIRED === "true",
      modelConstant: process.env.AXIOM_QVAC_CREDIT_MODEL ?? "QWEN3_600M_INST_Q4",
      contextSize: Number(process.env.AXIOM_QVAC_CONTEXT_SIZE ?? 4096),
    });
  }

  async decide(features: CreditFeatures): Promise<CreditDecision> {
    if (!this.options.enabled) return this.fallback.decide(features);

    try {
      const qvac = await import("@qvac/sdk");
      const prompt = creditPrompt(features);
      const text = await qvacCompletion(qvac, {
        modelConstant: this.options.modelConstant ?? "QWEN3_600M_INST_Q4",
        contextSize: this.options.contextSize ?? 4096,
        prompt,
      });

      return normalizeDecision(JSON.parse(extractJson(text)));
    } catch (error) {
      if (this.options.requireQvac) throw error;
      return this.fallback.decide(features);
    }
  }
}

async function qvacCompletion(
  qvac: QvacSdk,
  args: {
    modelConstant: string;
    contextSize: number;
    prompt: string;
  }
) {
  const modelSrc = (qvac as any)[args.modelConstant] ?? args.modelConstant;
  const modelId = await qvac.loadModel({
    modelSrc,
    modelType: "llm",
    modelConfig: {
      ctx_size: args.contextSize,
    },
  } as any);

  try {
    const result = qvac.completion({
      modelId,
      stream: false,
      history: [
        {
          role: "system",
          content:
            "You are AXIOM's private local credit model. Return only strict JSON.",
        },
        {
          role: "user",
          content: args.prompt,
        },
      ],
    } as any);

    return await result.text;
  } finally {
    await qvac.unloadModel({ modelId });
  }
}

function creditPrompt(features: CreditFeatures) {
  return JSON.stringify({
    task: "Classify borrower creditworthiness for a USDT loan.",
    outputSchema: {
      score: "integer 0-1000",
      tier: "bronze|silver|gold|platinum",
      maxLoanUsdt: "number",
      collateralBps: "integer",
      interestRateBps: "integer",
    },
    tierPolicy: TIER_CONFIG,
    features,
  });
}

function normalizeDecision(value: unknown): CreditDecision {
  const raw = value as Partial<CreditDecision>;
  const tier = normalizeTier(raw.tier);
  const config = TIER_CONFIG[tier];

  return {
    score: clampInt(Number(raw.score ?? config.minScore), 0, 1000),
    tier,
    maxLoanUsdt: positiveNumber(raw.maxLoanUsdt, config.maxLoanUsdt),
    collateralBps: clampInt(
      Number(raw.collateralBps ?? config.collateralBps),
      0,
      10_000
    ),
    interestRateBps: clampInt(
      Number(raw.interestRateBps ?? config.interestRateBps),
      0,
      10_000
    ),
  };
}

function normalizeTier(value: unknown): CreditTier {
  if (
    value === "bronze" ||
    value === "silver" ||
    value === "gold" ||
    value === "platinum"
  ) {
    return value;
  }

  return "bronze";
}

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("QVAC credit response did not contain JSON");
  }

  return text.slice(start, end + 1);
}

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function positiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
