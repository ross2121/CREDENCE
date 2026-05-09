"use client";

import { Connection, PublicKey } from "@solana/web3.js";
import { AXIOM_DEVNET } from "@/lib/devnet-pool";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

export type LiveLenderState = {
  lenderPosition: string | null;
  walletUsdc: number;
  depositedUsdc: number;
  withdrawnUsdc: number;
  suppliedUsdc: number;
  lastUpdated: string | null;
};

function readU64(data: Uint8Array, offset: number) {
  return new DataView(data.buffer, data.byteOffset + offset, 8).getBigUint64(
    0,
    true
  );
}

function readI64(data: Uint8Array, offset: number) {
  return new DataView(data.buffer, data.byteOffset + offset, 8).getBigInt64(
    0,
    true
  );
}

function uiUsdc(value: bigint) {
  return Number(value) / 1_000_000;
}

function formatDateTime(unixSeconds: number) {
  if (!unixSeconds) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(unixSeconds * 1000));
}

function getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey) {
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return address;
}

export function deriveLenderPosition(lender: PublicKey) {
  const [address] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("lender_position"),
      AXIOM_DEVNET.lendingPool.toBuffer(),
      lender.toBuffer(),
    ],
    AXIOM_DEVNET.programId
  );
  return address;
}

export async function fetchLenderState(
  lender: PublicKey
): Promise<LiveLenderState> {
  const connection = new Connection(AXIOM_DEVNET.rpcUrl, "confirmed");
  const lenderPosition = deriveLenderPosition(lender);
  const walletUsdcAta = getAssociatedTokenAddress(AXIOM_DEVNET.usdcMint, lender);
  const [positionAccount, walletTokenBalance] = await Promise.all([
    connection.getAccountInfo(lenderPosition, "confirmed"),
    connection
      .getTokenAccountBalance(walletUsdcAta, "confirmed")
      .catch(() => null),
  ]);

  const walletUsdc = Number(walletTokenBalance?.value.uiAmount ?? 0);
  if (!positionAccount) {
    return {
      lenderPosition: null,
      walletUsdc,
      depositedUsdc: 0,
      withdrawnUsdc: 0,
      suppliedUsdc: 0,
      lastUpdated: null,
    };
  }

  const deposited = readU64(positionAccount.data, 72);
  const withdrawn = readU64(positionAccount.data, 80);
  const supplied = deposited > withdrawn ? deposited - withdrawn : BigInt(0);

  return {
    lenderPosition: lenderPosition.toBase58(),
    walletUsdc,
    depositedUsdc: uiUsdc(deposited),
    withdrawnUsdc: uiUsdc(withdrawn),
    suppliedUsdc: uiUsdc(supplied),
    lastUpdated: formatDateTime(Number(readI64(positionAccount.data, 88))),
  };
}
