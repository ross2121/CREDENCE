"use client";

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import { Buffer } from "buffer";
import { AXIOM_DEVNET } from "@/lib/devnet-pool";

const KVAULT_PROGRAM_ID = new PublicKey(
  "devkRngFnfp4gBc5a3LsadgbQKdPo8MSZ4prFiNSVmY"
);
const KLEND_PROGRAM_ID = new PublicKey(
  "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD"
);
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);
const DEPOSIT_LIQUIDITY_DISCRIMINATOR = Uint8Array.from([
  245, 99, 59, 25, 151, 71, 233, 249,
]);
const REBALANCE_TO_KAMINO_DISCRIMINATOR = Uint8Array.from([
  243, 181, 203, 232, 220, 82, 49, 200,
]);
const VAULT_STATE_OFFSET = 8;
const VAULT_ALLOCATION_OFFSET = VAULT_STATE_OFFSET + 304;
const RESERVE_LENDING_MARKET_OFFSET = 32;

function amountData(discriminator: Uint8Array, amountUsdc: number) {
  if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) {
    throw new Error("Enter an amount greater than 0");
  }

  const data = new Uint8Array(16);
  data.set(discriminator, 0);
  new DataView(data.buffer).setBigUint64(
    8,
    BigInt(Math.floor(amountUsdc * 1_000_000)),
    true
  );
  return Buffer.from(data);
}

function pubkey(data: Buffer, offset: number) {
  return new PublicKey(data.subarray(offset, offset + 32));
}

function getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey) {
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return address;
}

async function sendAndConfirm(
  connection: Connection,
  wallet: WalletContextState,
  transaction: Transaction
) {
  if (!wallet.publicKey) throw new Error("Connect a wallet first");

  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = (
    await connection.getLatestBlockhash("confirmed")
  ).blockhash;

  const signature = await wallet.sendTransaction(transaction, connection);
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction(
    { signature, ...latestBlockhash },
    "confirmed"
  );
  return signature;
}

export async function depositLiquidityFromWallet({
  amountUsdc,
  connection,
  wallet,
}: {
  amountUsdc: number;
  connection: Connection;
  wallet: WalletContextState;
}) {
  if (!wallet.publicKey) throw new Error("Connect a wallet first");

  const lenderUsdc = getAssociatedTokenAddress(
    AXIOM_DEVNET.usdcMint,
    wallet.publicKey
  );
  const sourceAccount = await connection.getAccountInfo(
    lenderUsdc,
    "confirmed"
  );
  if (!sourceAccount) {
    throw new Error(
      `No devnet USDC token account found for this wallet: ${lenderUsdc.toBase58()}`
    );
  }

  const ix = new TransactionInstruction({
    programId: AXIOM_DEVNET.programId,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: lenderUsdc, isSigner: false, isWritable: true },
      { pubkey: AXIOM_DEVNET.lendingPool, isSigner: false, isWritable: true },
      { pubkey: AXIOM_DEVNET.usdcVault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: amountData(DEPOSIT_LIQUIDITY_DISCRIMINATOR, amountUsdc),
  });

  return sendAndConfirm(connection, wallet, new Transaction().add(ix));
}

export async function rebalanceToKaminoFromWallet({
  amountUsdc,
  connection,
  wallet,
}: {
  amountUsdc: number;
  connection: Connection;
  wallet: WalletContextState;
}) {
  if (!wallet.publicKey) throw new Error("Connect a wallet first");

  const [eventAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("__event_authority")],
    KVAULT_PROGRAM_ID
  );
  const vaultAccount = await connection.getAccountInfo(
    AXIOM_DEVNET.kaminoVault,
    "confirmed"
  );
  if (!vaultAccount) throw new Error("Kamino vault account not found");

  const vaultData = vaultAccount.data;
  const baseVaultAuthority = pubkey(vaultData, VAULT_STATE_OFFSET + 32);
  const tokenMint = pubkey(vaultData, VAULT_STATE_OFFSET + 72);
  const tokenVault = pubkey(vaultData, VAULT_STATE_OFFSET + 112);
  const tokenProgram = pubkey(vaultData, VAULT_STATE_OFFSET + 144);
  const sharesMint = pubkey(vaultData, VAULT_STATE_OFFSET + 176);
  const reserve = pubkey(vaultData, VAULT_ALLOCATION_OFFSET);
  const reserveAccount = await connection.getAccountInfo(reserve, "confirmed");
  if (!reserveAccount) throw new Error("Kamino reserve account not found");

  const lendingMarket = pubkey(
    reserveAccount.data,
    RESERVE_LENDING_MARKET_OFFSET
  );

  const ix = new TransactionInstruction({
    programId: AXIOM_DEVNET.programId,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
      { pubkey: AXIOM_DEVNET.lendingPool, isSigner: false, isWritable: true },
      { pubkey: AXIOM_DEVNET.kaminoVault, isSigner: false, isWritable: true },
      { pubkey: tokenVault, isSigner: false, isWritable: true },
      { pubkey: tokenMint, isSigner: false, isWritable: false },
      { pubkey: baseVaultAuthority, isSigner: false, isWritable: false },
      { pubkey: sharesMint, isSigner: false, isWritable: true },
      { pubkey: AXIOM_DEVNET.usdcVault, isSigner: false, isWritable: true },
      {
        pubkey: AXIOM_DEVNET.kaminoSharesAccount,
        isSigner: false,
        isWritable: true,
      },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: KVAULT_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: KLEND_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: reserve, isSigner: false, isWritable: true },
      { pubkey: lendingMarket, isSigner: false, isWritable: false },
    ],
    data: amountData(REBALANCE_TO_KAMINO_DISCRIMINATOR, amountUsdc),
  });

  return sendAndConfirm(connection, wallet, new Transaction().add(ix));
}
