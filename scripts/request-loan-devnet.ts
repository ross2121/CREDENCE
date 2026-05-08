import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";

const DEFAULT_RPC = "https://api.devnet.solana.com";
const DEFAULT_PROGRAM_ID = "6Xrd8Ymz9vxecWjifKern6LAzXQ2XKcS4D1zsJ8ENLpK";
const DEFAULT_COLLATERAL_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

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
  const collateralMint = new PublicKey(
    process.env.COLLATERAL_MINT ?? DEFAULT_COLLATERAL_MINT
  );
  const amountUsdc = Number(process.env.LOAN_USDT ?? 1_000);
  const durationDays = Number(process.env.LOAN_DURATION_DAYS ?? 30);
  const collateralUsdc = Number(process.env.COLLATERAL_USDT ?? 250);
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
  const [creditProof] = PublicKey.findProgramAddressSync(
    [Buffer.from("credit_proof"), wallet.publicKey.toBuffer()],
    programId
  );
  const [loan] = PublicKey.findProgramAddressSync(
    [Buffer.from("loan"), wallet.publicKey.toBuffer(), creditProof.toBuffer()],
    programId
  );

  const existingLoan = await connection.getAccountInfo(loan, "confirmed");
  if (existingLoan) {
    console.log("Loan already exists on devnet");
    console.log("Borrower:", wallet.publicKey.toBase58());
    console.log("Loan:", loan.toBase58());
    return;
  }

  const signature = await program.methods
    .requestLoan(
      new anchor.BN(Math.floor(amountUsdc * 1_000_000)),
      new anchor.BN(durationDays),
      new anchor.BN(Math.floor(collateralUsdc * 1_000_000)),
      wallet.publicKey
    )
    .accounts({
      borrower: wallet.publicKey,
      creditProof,
      collateralMint,
      loan,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction(
    { signature, ...latestBlockhash },
    "confirmed"
  );

  console.log("AXIOM borrower loan request complete");
  console.log("Borrower:", wallet.publicKey.toBase58());
  console.log("Credit proof:", creditProof.toBase58());
  console.log("Loan:", loan.toBase58());
  console.log("Amount:", amountUsdc);
  console.log("Duration days:", durationDays);
  console.log("Collateral:", collateralUsdc);
  console.log("Signature:", signature);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
