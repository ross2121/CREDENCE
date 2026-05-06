import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { basename, join } from "path";
import { spawnSync } from "child_process";

const fixture = process.argv[2];

if (!fixture) {
  throw new Error("Usage: npm run zk:prove -- fixtures/zk/silver.json");
}

const wasm = "build/zk/credit_score_js/credit_score.wasm";
const zkey = "build/zk/credit_score_final.zkey";

if (!existsSync(wasm) || !existsSync(zkey)) {
  throw new Error(
    "Missing circuit artifacts. Build credit_score.circom with circom/snarkjs before generating proofs."
  );
}

const outDir = join("build", "zk", "proofs");
mkdirSync(outDir, { recursive: true });

const fixtureJson = JSON.parse(readFileSync(fixture, "utf8"));
const inputPath = join(outDir, `${basename(fixture, ".json")}.input.json`);
const proofPath = join(outDir, `${basename(fixture, ".json")}.proof.json`);
const publicPath = join(outDir, `${basename(fixture, ".json")}.public.json`);
const proofBinPath = join(outDir, `${basename(fixture, ".json")}.proof.bin`);
const publicInputsPath = join(
  outDir,
  `${basename(fixture, ".json")}.public-inputs.json`
);

writeFileSync(
  inputPath,
  `${JSON.stringify(fixtureJson.input ?? fixtureJson, null, 2)}\n`
);

const result = spawnSync(
  "npx",
  [
    "snarkjs",
    "groth16",
    "fullprove",
    inputPath,
    wasm,
    zkey,
    proofPath,
    publicPath,
  ],
  { stdio: "inherit" }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const proofJson = JSON.parse(readFileSync(proofPath, "utf8"));
const publicJson = JSON.parse(readFileSync(publicPath, "utf8"));
const proofBytes = snarkjsProofToSolanaVerifierBytes(proofJson);

writeFileSync(proofBinPath, proofBytes);
writeFileSync(
  publicInputsPath,
  `${JSON.stringify(
    publicJson.map((input: string) => fieldToBytes32(input)),
    null,
    2
  )}\n`
);

console.log(`Wrote Solana verifier proof bytes: ${proofBinPath}`);
console.log(`Wrote Anchor public inputs: ${publicInputsPath}`);

function snarkjsProofToSolanaVerifierBytes(proof: {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
}): Buffer {
  return Buffer.concat([
    g1ToBytes(proof.pi_a[0], negateG1Y(proof.pi_a[1])),
    g2ToBytes(proof.pi_b),
    g1ToBytes(proof.pi_c[0], proof.pi_c[1]),
  ]);
}

function g1ToBytes(x: string, y: string): Buffer {
  return Buffer.concat([fieldToBuffer(x), fieldToBuffer(y)]);
}

function g2ToBytes(point: string[][]): Buffer {
  return Buffer.concat([
    fieldToBuffer(point[0][1]),
    fieldToBuffer(point[0][0]),
    fieldToBuffer(point[1][1]),
    fieldToBuffer(point[1][0]),
  ]);
}

function negateG1Y(y: string): string {
  const baseFieldModulus = BigInt(
    "21888242871839275222246405745257275088696311157297823662689037894645226208583"
  );
  const value = BigInt(y);
  return value === BigInt(0) ? "0" : (baseFieldModulus - value).toString();
}

function fieldToBytes32(input: string): number[] {
  return Array.from(fieldToBuffer(input));
}

function fieldToBuffer(input: string): Buffer {
  const value = BigInt(input);
  if (value < BigInt(0)) {
    throw new Error(`Field value cannot be negative: ${input}`);
  }

  const hex = value.toString(16).padStart(64, "0");
  if (hex.length > 64) {
    throw new Error(`Field value exceeds 32 bytes: ${input}`);
  }

  return Buffer.from(hex, "hex");
}
