import { existsSync, mkdirSync } from "fs";
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

const proofPath = join(outDir, `${basename(fixture, ".json")}.proof.json`);
const publicPath = join(outDir, `${basename(fixture, ".json")}.public.json`);

const result = spawnSync(
  "npx",
  [
    "snarkjs",
    "groth16",
    "fullprove",
    fixture,
    wasm,
    zkey,
    proofPath,
    publicPath,
  ],
  { stdio: "inherit" }
);

process.exit(result.status ?? 1);
