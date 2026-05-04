import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";

const DEFAULT_RPC = "https://api.devnet.solana.com";
const DEFAULT_PROGRAM_ID = "6Xrd8Ymz9vxecWjifKern6LAzXQ2XKcS4D1zsJ8ENLpK";
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

function expandPath(path: string) {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return join(homedir(), path.slice(2));
  return path;
}

function loadWallet(path: string) {
  const secret = JSON.parse(readFileSync(expandPath(path), "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

function requiredPublicKey(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return new PublicKey(value);
}

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL ?? DEFAULT_RPC;
  const programId = new PublicKey(
    process.env.AXIOM_PROGRAM_ID ?? DEFAULT_PROGRAM_ID
  );
  const usdtVault = requiredPublicKey("USDT_VAULT");
  const lenderUsdt = requiredPublicKey("LENDER_USDT_ACCOUNT");
  const amountUsdt = Number(process.env.DEPOSIT_USDT ?? 100_000);
  const amountUnits = new anchor.BN(Math.floor(amountUsdt * 1_000_000));
  const walletPath =
    process.env.ANCHOR_PROVIDER_WALLET ?? "~/.config/solana/id.json";
  const idlPath = resolve(process.cwd(), "target", "idl", "axiom.json");

  if (!existsSync(idlPath)) {
    throw new Error("target/idl/axiom.json is missing; run anchor build first");
  }

  const wallet = new anchor.Wallet(loadWallet(walletPath));
  const connection = new Connection(rpcUrl, "confirmed");
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  const idl = JSON.parse(readFileSync(idlPath, "utf8"));
  const program = new anchor.Program(idl as anchor.Idl, provider);
  const [lendingPool] = PublicKey.findProgramAddressSync(
    [Buffer.from("lending_pool"), usdtVault.toBuffer()],
    programId
  );

  const signature = await program.methods
    .depositLiquidity(amountUnits)
    .accounts({
      lender: wallet.publicKey,
      lenderUsdt,
      lendingPool,
      usdtVault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction(
    { signature, ...latestBlockhash },
    "confirmed"
  );

  console.log("AXIOM devnet pool funded");
  console.log("Program:", programId.toBase58());
  console.log("Lender USDT:", lenderUsdt.toBase58());
  console.log("USDT vault:", usdtVault.toBase58());
  console.log("Lending pool:", lendingPool.toBase58());
  console.log("Deposited USDT:", amountUsdt);
  console.log("Signature:", signature);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
