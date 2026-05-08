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
  disbursed: boolean;
  outstandingPrincipalUsdc: number;
};

export type LiveRepaymentStream = {
  address: string;
  borrower: string;
  streamVault: string;
  totalDueUsdc: number;
  fundedUsdc: number;
  claimedUsdc: number;
  availableVaultUsdc: number;
  accruedUsdc: number;
  claimableUsdc: number;
  healthBps: number;
  streamRateUsdcPerSecond: number;
  startDate: string;
  endDate: string;
  lastClaimDate: string;
  startTimeUnix: number;
  endTimeUnix: number;
  lastClaimTimeUnix: number;
  canClose: boolean;
};

export type LiveBorrowerState = {
  creditProof: LiveCreditProof | null;
  loan: LiveLoan | null;
  repaymentStream: LiveRepaymentStream | null;
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

function formatDateTime(unixSeconds: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

export function deriveRepaymentStream(loan: PublicKey) {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from("repayment_stream"), loan.toBuffer()],
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
        disbursed: Number(readU64(loanAccount.data, 161)) > 0,
        outstandingPrincipalUsdc: uiUsdc(
          readU64(loanAccount.data, 40) - readU64(loanAccount.data, 145)
        ),
      }
    : null;

  if (!loan) {
    return { creditProof, loan, repaymentStream: null };
  }

  const repaymentStreamAddress = deriveRepaymentStream(loanAddress);
  const repaymentStreamAccount = await connection.getAccountInfo(
    repaymentStreamAddress,
    "confirmed"
  );

  const repaymentStream = repaymentStreamAccount
    ? (() => {
        const data = repaymentStreamAccount.data;
        const totalDue = readU64(data, 104);
        const funded = readU64(data, 112);
        const claimed = readU64(data, 120);
        const streamRate = readU64(data, 128);
        const startTime = Number(readI64(data, 136));
        const endTime = Number(readI64(data, 144));
        const lastClaimTime = Number(readI64(data, 152));
        const now = Math.floor(Date.now() / 1000);
        const cappedNow = Math.min(now, endTime);
        const elapsedSeconds = Math.max(cappedNow - startTime, 0);
        const accrued = [streamRate * BigInt(elapsedSeconds), totalDue].reduce(
          (min, value) => (value < min ? value : min),
          totalDue
        );
        const accruedUnclaimed =
          accrued > claimed ? accrued - claimed : BigInt(0);
        const fundedUnclaimed =
          funded > claimed ? funded - claimed : BigInt(0);
        const claimable =
          accruedUnclaimed < fundedUnclaimed ? accruedUnclaimed : fundedUnclaimed;
        const healthBps =
          accrued > BigInt(0)
            ? Math.round((Number(funded) / Number(accrued)) * 10_000)
            : 10_000;

        return {
          address: repaymentStreamAddress.toBase58(),
          borrower: readPubkey(data, 40).toBase58(),
          streamVault: readPubkey(data, 72).toBase58(),
          totalDueUsdc: uiUsdc(totalDue),
          fundedUsdc: uiUsdc(funded),
          claimedUsdc: uiUsdc(claimed),
          availableVaultUsdc: uiUsdc(
            funded > claimed ? funded - claimed : BigInt(0)
          ),
          accruedUsdc: uiUsdc(accrued),
          claimableUsdc: uiUsdc(claimable),
          healthBps,
          streamRateUsdcPerSecond: uiUsdc(streamRate),
          startDate: formatDateTime(startTime),
          endDate: formatDateTime(endTime),
          lastClaimDate: formatDateTime(lastClaimTime),
          startTimeUnix: startTime,
          endTimeUnix: endTime,
          lastClaimTimeUnix: lastClaimTime,
          canClose: claimed >= totalDue,
        };
      })()
    : null;

  return { creditProof, loan, repaymentStream };
}
