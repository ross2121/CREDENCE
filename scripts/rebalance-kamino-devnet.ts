import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";

const DEFAULT_RPC = "https://api.devnet.solana.com";
const DEFAULT_PROGRAM_ID = "6Xrd8Ymz9vxecWjifKern6LAzXQ2XKcS4D1zsJ8ENLpK";
const KVAULT_PROGRAM_ID = new PublicKey(
  "devkRngFnfp4gBc5a3LsadgbQKdPo8MSZ4prFiNSVmY"
);
const KLEND_PROGRAM_ID = new PublicKey(
  "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD"
);
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const VAULT_STATE_OFFSET = 8;
const VAULT_ALLOCATION_OFFSET = VAULT_STATE_OFFSET + 304;
const VAULT_ALLOCATION_SIZE = 2_160;
const RESERVE_LENDING_MARKET_OFFSET = 32;

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

function pubkey(data: Buffer, offset: number) {
  return new PublicKey(data.subarray(offset, offset + 32));
}

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL ?? DEFAULT_RPC;
  const programId = new PublicKey(
    process.env.AXIOM_PROGRAM_ID ?? DEFAULT_PROGRAM_ID
  );
  const usdtVault = requiredPublicKey("USDT_VAULT");
  const userSharesAta = requiredPublicKey("USER_SHARES_ATA");
  const kaminoVault = requiredPublicKey("KAMINO_VAULT");
  const amountUsdc = Number(process.env.REBALANCE_USDC ?? 1);
  const amountUnits = new anchor.BN(Math.floor(amountUsdc * 1_000_000));
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
  const [eventAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("__event_authority")],
    KVAULT_PROGRAM_ID
  );

  const vaultAccount = await connection.getAccountInfo(kaminoVault);
  if (!vaultAccount) throw new Error(`Kamino vault not found: ${kaminoVault}`);
  const vaultData = vaultAccount.data;
  const baseVaultAuthority = pubkey(vaultData, VAULT_STATE_OFFSET + 32);
  const tokenMint = pubkey(vaultData, VAULT_STATE_OFFSET + 72);
  const tokenVault = pubkey(vaultData, VAULT_STATE_OFFSET + 112);
  const tokenProgram = pubkey(vaultData, VAULT_STATE_OFFSET + 144);
  const sharesMint = pubkey(vaultData, VAULT_STATE_OFFSET + 176);
  const sharesTokenProgram = tokenProgram.equals(TOKEN_PROGRAM_ID)
    ? TOKEN_PROGRAM_ID
    : TOKEN_PROGRAM_ID;
  const reserve = pubkey(vaultData, VAULT_ALLOCATION_OFFSET);

  if (reserve.equals(PublicKey.default)) {
    throw new Error(`Kamino vault has no reserve allocation: ${kaminoVault}`);
  }

  const reserveAccount = await connection.getAccountInfo(reserve);
  if (!reserveAccount) throw new Error(`Kamino reserve not found: ${reserve}`);
  const lendingMarket = pubkey(
    reserveAccount.data,
    RESERVE_LENDING_MARKET_OFFSET
  );

  const signature = await program.methods
    .rebalanceToKamino(amountUnits)
    .accounts({
      authority: wallet.publicKey,
      lendingPool,
      kaminoVault,
      tokenVault,
      tokenMint,
      baseVaultAuthority,
      sharesMint,
      userTokenAta: usdtVault,
      userSharesAta,
      eventAuthority,
      kvaultProgram: KVAULT_PROGRAM_ID,
      klendProgram: KLEND_PROGRAM_ID,
      tokenProgram,
      sharesTokenProgram,
    })
    .remainingAccounts([
      { pubkey: reserve, isWritable: true, isSigner: false },
      { pubkey: lendingMarket, isWritable: false, isSigner: false },
    ])
    .rpc();

  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction(
    { signature, ...latestBlockhash },
    "confirmed"
  );

  console.log("AXIOM liquidity rebalanced to Kamino");
  console.log("Program:", programId.toBase58());
  console.log("Lending pool:", lendingPool.toBase58());
  console.log("AXIOM USDC vault:", usdtVault.toBase58());
  console.log("AXIOM shares account:", userSharesAta.toBase58());
  console.log("Kamino vault:", kaminoVault.toBase58());
  console.log("Kamino reserve:", reserve.toBase58());
  console.log("Kamino lending market:", lendingMarket.toBase58());
  console.log("Deposited USDC:", amountUsdc);
  console.log("Signature:", signature);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
