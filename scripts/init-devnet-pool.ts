import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";

const DEFAULT_RPC = "https://api.devnet.solana.com";
const DEFAULT_PROGRAM_ID = "6Xrd8Ymz9vxecWjifKern6LAzXQ2XKcS4D1zsJ8ENLpK";
const DEFAULT_KAMINO_VAULT = "11111111111111111111111111111111";

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
  const usdtVault = new PublicKey(
    process.env.USDT_VAULT ??
      (() => {
        throw new Error("USDT_VAULT is required");
      })()
  );
  const kaminoVault = new PublicKey(
    process.env.KAMINO_VAULT ?? DEFAULT_KAMINO_VAULT
  );
  const baseInterestRateBps = Number(process.env.BASE_INTEREST_RATE_BPS ?? 800);
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

  const existingPool = await connection.getAccountInfo(lendingPool);
  if (existingPool) {
    console.log("AXIOM devnet lending pool already exists");
    console.log("Program:", programId.toBase58());
    console.log("USDT vault:", usdtVault.toBase58());
    console.log("Lending pool:", lendingPool.toBase58());
    return;
  }

  const signature = await program.methods
    .initializePool(new anchor.BN(baseInterestRateBps), kaminoVault)
    .accounts({
      authority: wallet.publicKey,
      usdtVault,
      kaminoVault,
      lendingPool,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction(
    { signature, ...latestBlockhash },
    "confirmed"
  );

  console.log("AXIOM devnet lending pool initialized");
  console.log("Program:", programId.toBase58());
  console.log("USDT vault:", usdtVault.toBase58());
  console.log("Lending pool:", lendingPool.toBase58());
  console.log("Base interest bps:", baseInterestRateBps);
  console.log("Signature:", signature);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
