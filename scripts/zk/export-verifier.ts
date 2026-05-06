import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

const zkey = "build/zk/credit_score_final.zkey";
const outDir = join("build", "zk");
const verifierJson = join(outDir, "verification_key.json");
const anchorExport = join(outDir, "anchor_verifier_stub.json");
const rustVerifier = "programs/axiom/src/verifying_key.rs";

if (!existsSync(zkey)) {
  throw new Error("Missing build/zk/credit_score_final.zkey");
}

mkdirSync(outDir, { recursive: true });

const result = spawnSync(
  "npx",
  ["snarkjs", "zkey", "export", "verificationkey", zkey, verifierJson],
  { stdio: "inherit" }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

writeFileSync(
  anchorExport,
  `${JSON.stringify(
    {
      circuit: "credit_score",
      proofSystem: "groth16",
      publicInputs: ["tier_threshold", "wallet_commitment", "model_commitment"],
      verificationKey: verifierJson,
    },
    null,
    2
  )}\n`
);

const verificationKey = JSON.parse(readFileSync(verifierJson, "utf8"));
writeFileSync(rustVerifier, verificationKeyToRust(verificationKey));
console.log(`Wrote Anchor verifier key: ${rustVerifier}`);

function verificationKeyToRust(vk: {
  vk_alpha_1: string[];
  vk_beta_2: string[][];
  vk_gamma_2: string[][];
  vk_delta_2: string[][];
  IC: string[][];
}): string {
  return `use groth16_solana::groth16::Groth16Verifyingkey;

pub const VERIFYINGKEY: Groth16Verifyingkey = Groth16Verifyingkey {
    nr_pubinputs: ${vk.IC.length},
    vk_alpha_g1: ${rustArray(g1ToBytes(vk.vk_alpha_1[0], vk.vk_alpha_1[1]), 4)},
    vk_beta_g2: ${rustArray(g2ToBytes(vk.vk_beta_2), 4)},
    vk_gamme_g2: ${rustArray(g2ToBytes(vk.vk_gamma_2), 4)},
    vk_delta_g2: ${rustArray(g2ToBytes(vk.vk_delta_2), 4)},
    vk_ic: &[
${vk.IC.map(
  (point) => `        ${rustArray(g1ToBytes(point[0], point[1]), 8)},`
).join("\n")}
    ],
};
`;
}

function g1ToBytes(x: string, y: string): number[] {
  return [...fieldToBytes(x), ...fieldToBytes(y)];
}

function g2ToBytes(point: string[][]): number[] {
  return [
    ...fieldToBytes(point[0][1]),
    ...fieldToBytes(point[0][0]),
    ...fieldToBytes(point[1][1]),
    ...fieldToBytes(point[1][0]),
  ];
}

function fieldToBytes(input: string): number[] {
  const value = BigInt(input);
  if (value < BigInt(0)) {
    throw new Error(`Field value cannot be negative: ${input}`);
  }

  const hex = value.toString(16).padStart(64, "0");
  if (hex.length > 64) {
    throw new Error(`Field value exceeds 32 bytes: ${input}`);
  }

  return Array.from(Buffer.from(hex, "hex"));
}

function rustArray(values: number[], indent: number): string {
  const spaces = " ".repeat(indent);
  const lines = [];
  for (let i = 0; i < values.length; i += 16) {
    lines.push(`${spaces}${values.slice(i, i + 16).join(", ")},`);
  }
  return `[\n${lines.join("\n")}\n${" ".repeat(Math.max(indent - 4, 0))}]`;
}
