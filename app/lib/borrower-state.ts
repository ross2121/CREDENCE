"use client";

import { Connection, PublicKey } from "@solana/web3.js";
import { AXIOM_DEVNET } from "@/lib/devnet-pool";

export type LiveCreditProof = {
  address: string;
  wallet: string;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
  maxLoanUsdc: number;
  expiresAt: string;
  expiresAtUnix: number;
};

export type LiveLoan = {
  address: string;
  borrower: string;
  principalUsdc: number;
  repaidUsdc: number;
  collateralMint: string;
  collateralUsdc: number;
  interestBps: number;
  dueDate: string;
  dueTimeUnix: number;
  status: "Active" | "Repaid" | "Defaulted" | "Liquidated";
};

export type LiveBorrowerState = {
  creditProof: LiveCreditProof | null;
  loan: LiveLoan | null;
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

function readPubkey(data: Uint8Array, offset: number) {
  return new PublicKey(data.slice(offset, offset + 32));
}

function uiUsdc(value: bigint) {
  return Number(value) / 1_000_000;
}

function formatDate(unixSeconds: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(unixSeconds * 1000));
}

function parseTier(value: number): LiveCreditProof["tier"] {
  return ["Bronze", "Silver", "Gold", "Platinum"][value] as LiveCreditProof["tier"];
}

function parseStatus(value: number): LiveLoan["status"] {
  return ["Active", "Repaid", "Defaulted", "Liquidated"][value] as LiveLoan["status"];
}

export function deriveCreditProof(wallet: PublicKey) {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from("credit_proof"), wallet.toBuffer()],
    AXIOM_DEVNET.programId
  );
  return address;
}

export function deriveLoan(wallet: PublicKey, creditProof: PublicKey) {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from("loan"), wallet.toBuffer(), creditProof.toBuffer()],
    AXIOM_DEVNET.programId
  );
  return address;
}

export async function fetchBorrowerState(
  wallet: PublicKey
): Promise<LiveBorrowerState> {
  const connection = new Connection(AXIOM_DEVNET.rpcUrl, "confirmed");
  const creditProofAddress = deriveCreditProof(wallet);
  const loanAddress = deriveLoan(wallet, creditProofAddress);
  const [creditProofAccount, loanAccount] = await Promise.all([
    connection.getAccountInfo(creditProofAddress, "confirmed"),
    connection.getAccountInfo(loanAddress, "confirmed"),
  ]);

  const creditProof = creditProofAccount
    ? {
        address: creditProofAddress.toBase58(),
        wallet: readPubkey(creditProofAccount.data, 8).toBase58(),
        tier: parseTier(creditProofAccount.data[40]),
        maxLoanUsdc: uiUsdc(readU64(creditProofAccount.data, 89)),
        expiresAt: formatDate(Number(readI64(creditProofAccount.data, 81))),
        expiresAtUnix: Number(readI64(creditProofAccount.data, 81)),
      }
    : null;

  const loan = loanAccount
    ? {
        address: loanAddress.toBase58(),
        borrower: readPubkey(loanAccount.data, 8).toBase58(),
        principalUsdc: uiUsdc(readU64(loanAccount.data, 40)),
        repaidUsdc: uiUsdc(readU64(loanAccount.data, 145)),
        collateralMint: readPubkey(loanAccount.data, 56).toBase58(),
        collateralUsdc: uiUsdc(readU64(loanAccount.data, 88)),
        interestBps: Number(readU64(loanAccount.data, 48)),
        dueDate: formatDate(Number(readI64(loanAccount.data, 137))),
        dueTimeUnix: Number(readI64(loanAccount.data, 137)),
        status: parseStatus(loanAccount.data[169]),
      }
    : null;

  return { creditProof, loan };
}
