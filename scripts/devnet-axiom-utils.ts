import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";

export const DEFAULT_RPC = "https://api.devnet.solana.com";
export const DEFAULT_PROGRAM_ID = "6Xrd8Ymz9vxecWjifKern6LAzXQ2XKcS4D1zsJ8ENLpK";
export const DEFAULT_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const DEFAULT_USDC_VAULT = "AaywYs28UTX946bnaXya79GP9X6tj2ScVeb9Z1UHKQa6";
export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

export function expandPath(path: string) {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return join(homedir(), path.slice(2));
  return path;
}

export function loadWallet(path: string) {
  const secret = JSON.parse(readFileSync(expandPath(path), "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

export async function loadProgram() {
  const rpcUrl = process.env.SOLANA_RPC_URL ?? DEFAULT_RPC;
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

  return { connection, program, provider, wallet };
}

export function getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey) {
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return address;
}

export function createAssociatedTokenAccountInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey
) {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedToken, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.alloc(0),
  });
}

export async function ensureAssociatedTokenAccount(
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey
) {
  const ata = getAssociatedTokenAddress(mint, owner);
  const existing = await connection.getAccountInfo(ata, "confirmed");
  const instruction = existing
    ? null
    : createAssociatedTokenAccountInstruction(payer, ata, owner, mint);
  return { ata, instruction };
}
