import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";

const DEFAULT_RPC = "https://api.devnet.solana.com";
const DEFAULT_PROGRAM_ID = "6Xrd8Ymz9vxecWjifKern6LAzXQ2XKcS4D1zsJ8ENLpK";
const DEFAULT_PROOF = "build/zk/proofs/silver.proof.bin";
const DEFAULT_PUBLIC_INPUTS = "build/zk/proofs/silver.public-inputs.json";

function expandPath(path: string) {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return join(homedir(), path.slice(2));
  return path;
}

function loadWallet(path: string) {
  const secret = JSON.parse(readFileSync(expandPath(path), "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL ?? DEFAULT_RPC;
  const programId = new PublicKey(
    process.env.AXIOM_PROGRAM_ID ?? DEFAULT_PROGRAM_ID
  );
  const walletPath =
    process.env.ANCHOR_PROVIDER_WALLET ?? "~/.config/solana/id.json";
  const idlPath = resolve(process.cwd(), "target", "idl", "axiom.json");
  const proofPath = process.env.ZK_PROOF_PATH ?? DEFAULT_PROOF;
  const publicInputsPath =
    process.env.ZK_PUBLIC_INPUTS_PATH ?? DEFAULT_PUBLIC_INPUTS;

  if (!existsSync(idlPath)) {
    throw new Error("target/idl/axiom.json is missing; run anchor build first");
  }
  if (!existsSync(proofPath) || !existsSync(publicInputsPath)) {
    throw new Error(
      "ZK proof files are missing; run `npm run zk:prove -- fixtures/zk/silver.json` first"
    );
  }

  const wallet = new anchor.Wallet(loadWallet(walletPath));
  const connection = new Connection(rpcUrl, "confirmed");
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  const idl = JSON.parse(readFileSync(idlPath, "utf8"));
  const program = new anchor.Program(idl as anchor.Idl, provider);
  const [creditProof] = PublicKey.findProgramAddressSync(
    [Buffer.from("credit_proof"), wallet.publicKey.toBuffer()],
    programId
  );

  const existingProof = await connection.getAccountInfo(creditProof);
  if (existingProof) {
    console.log("Credit proof already exists on devnet");
    console.log("Program:", programId.toBase58());
    console.log("Borrower:", wallet.publicKey.toBase58());
    console.log("Credit proof:", creditProof.toBase58());
    return;
  }

  const proof = readFileSync(proofPath);
  const publicInputs = JSON.parse(readFileSync(publicInputsPath, "utf8")).map(
    (input: number[]) => input
  );
  const expiry = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

  const signature = await (program.methods as any)
    .registerCreditProof(
      { silver: {} },
      new anchor.BN(10_000),
      proof,
      publicInputs,
      new anchor.BN(expiry)
    )
    .accounts({
      borrower: wallet.publicKey,
      creditProof,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction(
    { signature, ...latestBlockhash },
    "confirmed"
  );

  console.log("AXIOM devnet ZK proof registration passed");
  console.log("Program:", programId.toBase58());
  console.log("Borrower:", wallet.publicKey.toBase58());
  console.log("Credit proof:", creditProof.toBase58());
  console.log("Signature:", signature);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
