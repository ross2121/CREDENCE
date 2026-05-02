import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

type TierName = "bronze" | "silver" | "gold" | "platinum";

type Fixture = {
  tier: TierName;
  input: {
    credit_score: string;
    wallet_secret: string;
    model_secret: string;
    tier_threshold: string;
    wallet_hash: string;
    model_hash: string;
  };
  publicSignals: string[];
};

const tiers: Record<TierName, { threshold: number; score: number }> = {
  bronze: { threshold: 400, score: 599 },
  silver: { threshold: 600, score: 749 },
  gold: { threshold: 750, score: 899 },
  platinum: { threshold: 900, score: 1000 },
};

function fieldElement(label: string): string {
  const digest = createHash("sha256").update(label).digest("hex");
  const value = BigInt(`0x${digest}`) / BigInt(256);
  return value.toString();
}

function fixtureFor(tier: TierName): Fixture {
  const walletHash = fieldElement(`axiom:${tier}:wallet`);
  const modelHash = fieldElement("AXIOM_CREDIT_MODEL_V1");
  const { threshold, score } = tiers[tier];

  return {
    tier,
    input: {
      credit_score: score.toString(),
      wallet_secret: walletHash,
      model_secret: modelHash,
      tier_threshold: threshold.toString(),
      wallet_hash: walletHash,
      model_hash: modelHash,
    },
    publicSignals: [threshold.toString(), walletHash, modelHash],
  };
}

function main() {
  const outDir = join(process.cwd(), "fixtures", "zk");
  mkdirSync(outDir, { recursive: true });

  for (const tier of Object.keys(tiers) as TierName[]) {
    const fixture = fixtureFor(tier);
    writeFileSync(
      join(outDir, `${tier}.json`),
      `${JSON.stringify(fixture, null, 2)}\n`
    );
  }
}

main();
