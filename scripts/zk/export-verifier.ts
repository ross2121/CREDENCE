import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

const zkey = "build/zk/credit_score_final.zkey";
const outDir = join("build", "zk");
const verifierJson = join(outDir, "verification_key.json");
const anchorExport = join(outDir, "anchor_verifier_stub.json");

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
      publicInputs: ["tier_threshold", "wallet_hash", "model_hash"],
      verificationKey: verifierJson,
    },
    null,
    2
  )}\n`
);
