import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { buildPoseidon } from "circomlibjs";

type TierName = "bronze" | "silver" | "gold" | "platinum";

type Fixture = {
  tier: TierName;
  input: {
    credit_score: string;
    wallet_secret: string;
    wallet_salt: string;
    model_secret: string;
    model_salt: string;
    tier_threshold: string;
    wallet_commitment: string;
    model_commitment: string;
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

type Poseidon = Awaited<ReturnType<typeof buildPoseidon>>;

function poseidonField(poseidon: Poseidon, values: string[]): string {
  return poseidon.F.toString(poseidon(values.map((value) => BigInt(value))));
}

function fixtureFor(tier: TierName, poseidon: Poseidon): Fixture {
  const walletSecret = fieldElement(`axiom:${tier}:wallet`);
  const walletSalt = fieldElement(`axiom:${tier}:wallet:salt`);
  const modelSecret = fieldElement("AXIOM_CREDIT_MODEL_V1");
  const modelSalt = fieldElement("AXIOM_CREDIT_MODEL_V1:salt");
  const walletCommitment = poseidonField(poseidon, [
    walletSecret,
    walletSalt,
    "1001",
  ]);
  const modelCommitment = poseidonField(poseidon, [
    modelSecret,
    modelSalt,
    "2001",
  ]);
  const { threshold, score } = tiers[tier];

  return {
    tier,
    input: {
      credit_score: score.toString(),
      wallet_secret: walletSecret,
      wallet_salt: walletSalt,
      model_secret: modelSecret,
      model_salt: modelSalt,
      tier_threshold: threshold.toString(),
      wallet_commitment: walletCommitment,
      model_commitment: modelCommitment,
    },
    publicSignals: [threshold.toString(), walletCommitment, modelCommitment],
  };
}

async function main() {
  const outDir = join(process.cwd(), "fixtures", "zk");
  mkdirSync(outDir, { recursive: true });
  const poseidon = await buildPoseidon();

  for (const tier of Object.keys(tiers) as TierName[]) {
    const fixture = fixtureFor(tier, poseidon);
    writeFileSync(
      join(outDir, `${tier}.json`),
      `${JSON.stringify(fixture, null, 2)}\n`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
