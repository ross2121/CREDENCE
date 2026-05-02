import {
  AllocationDecision,
  PoolSnapshot,
  YieldMarketSnapshot,
} from "./types";
import { YieldStrategy } from "./strategy";

type QvacSdk = typeof import("@qvac/sdk");

export type QvacYieldStrategyOptions = {
  enabled?: boolean;
  requireQvac?: boolean;
  modelConstant?: string;
  contextSize?: number;
};

export class QvacYieldStrategy {
  private readonly fallback = new YieldStrategy();

  constructor(readonly options: QvacYieldStrategyOptions = {}) {}

  static fromEnv() {
    return new QvacYieldStrategy({
      enabled: process.env.AXIOM_QVAC_ENABLED === "true",
      requireQvac: process.env.AXIOM_QVAC_REQUIRED === "true",
      modelConstant: process.env.AXIOM_QVAC_YIELD_MODEL ?? "QWEN3_600M_INST_Q4",
      contextSize: Number(process.env.AXIOM_QVAC_CONTEXT_SIZE ?? 4096),
    });
  }

  async decide(
    pool: PoolSnapshot,
    market: YieldMarketSnapshot
  ): Promise<AllocationDecision> {
    const fallbackDecision = this.fallback.decide(pool, market);
    if (!this.options.enabled) return fallbackDecision;

    try {
      const qvac = await import("@qvac/sdk");
      const text = await qvacCompletion(qvac, {
        modelConstant: this.options.modelConstant ?? "QWEN3_600M_INST_Q4",
        contextSize: this.options.contextSize ?? 4096,
        prompt: yieldPrompt(pool, market, fallbackDecision),
      });

      return normalizeDecision(JSON.parse(extractJson(text)), fallbackDecision);
    } catch (error) {
      if (this.options.requireQvac) throw error;
      return fallbackDecision;
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
            "You are AXIOM's private local yield agent. Return only strict JSON.",
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

function yieldPrompt(
  pool: PoolSnapshot,
  market: YieldMarketSnapshot,
  baseline: AllocationDecision
) {
  return JSON.stringify({
    task: "Choose AXIOM USDT allocation between pool liquidity and Kamino.",
    constraints: {
      actions: ["depositToKamino", "withdrawFromKamino", "hold"],
      amountUsdt: "must be non-negative and policy-safe",
      output: {
        action: "depositToKamino|withdrawFromKamino|hold",
        amountUsdt: "number",
        targetKaminoAllocationBps: "integer",
        reason: "short string",
      },
    },
    pool: {
      liquidUsdt: pool.liquidUsdt,
      totalDeposits: pool.totalDeposits,
      totalBorrowed: pool.totalBorrowed,
      kaminoAllocatedUsdt: pool.kaminoAllocatedUsdt,
      kaminoAllocationBps: pool.kaminoAllocationBps,
    },
    market,
    deterministicBaseline: baseline,
  });
}

function normalizeDecision(
  value: unknown,
  fallback: AllocationDecision
): AllocationDecision {
  const raw = value as Partial<AllocationDecision>;
  const action =
    raw.action === "depositToKamino" ||
    raw.action === "withdrawFromKamino" ||
    raw.action === "hold"
      ? raw.action
      : fallback.action;

  return {
    action,
    amountUsdt: Math.max(0, Math.floor(Number(raw.amountUsdt ?? fallback.amountUsdt))),
    targetKaminoAllocationBps: clampInt(
      Number(raw.targetKaminoAllocationBps ?? fallback.targetKaminoAllocationBps),
      0,
      10_000
    ),
    reason:
      typeof raw.reason === "string" && raw.reason.length > 0
        ? raw.reason
        : fallback.reason,
  };
}

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("QVAC yield response did not contain JSON");
  }

  return text.slice(start, end + 1);
}

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}
