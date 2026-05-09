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
  collateralVault: string | null;
  collateralEscrowed: boolean;
  collateralReleased: boolean;
  collateralLiquidated: boolean;
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

export type LiveLiquidationState = {
  address: string;
  collateralValueUsdc: number;
  liquidationThresholdUsdc: number;
  recoveredUsdc: number;
  warningActive: boolean;
  graceEndsAt: string;
  graceEndsAtUnix: number;
  canExecute: boolean;
};

export type LiveBorrowerState = {
  creditProof: LiveCreditProof | null;
  loan: LiveLoan | null;
  repaymentStream: LiveRepaymentStream | null;
  liquidationState: LiveLiquidationState | null;
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

export function deriveCollateralEscrow(loan: PublicKey) {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from("collateral_escrow"), loan.toBuffer()],
    AXIOM_DEVNET.programId
  );
  return address;
}

export function deriveCollateralVault(loan: PublicKey) {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from("collateral_vault"), loan.toBuffer()],
    AXIOM_DEVNET.programId
  );
  return address;
}

export function deriveLiquidationState(loan: PublicKey) {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from("liquidation"), loan.toBuffer()],
    AXIOM_DEVNET.programId
  );
  return address;
}

export function deriveReputation(wallet: PublicKey) {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from("reputation"), wallet.toBuffer()],
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
  const collateralEscrowAddress = deriveCollateralEscrow(loanAddress);
  const [creditProofAccount, loanAccount, collateralEscrowAccount] = await Promise.all([
    connection.getAccountInfo(creditProofAddress, "confirmed"),
    connection.getAccountInfo(loanAddress, "confirmed"),
    connection.getAccountInfo(collateralEscrowAddress, "confirmed"),
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

  const collateralEscrow = collateralEscrowAccount
    ? {
        collateralVault: readPubkey(collateralEscrowAccount.data, 104).toBase58(),
        escrowed: collateralEscrowAccount.data[144] === 1,
        released: collateralEscrowAccount.data[145] === 1,
        liquidated: collateralEscrowAccount.data[146] === 1,
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
        collateralVault: collateralEscrow?.collateralVault ?? null,
        collateralEscrowed: collateralEscrow?.escrowed ?? false,
        collateralReleased: collateralEscrow?.released ?? false,
        collateralLiquidated: collateralEscrow?.liquidated ?? false,
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
    return { creditProof, loan, repaymentStream: null, liquidationState: null };
  }

  const repaymentStreamAddress = deriveRepaymentStream(loanAddress);
  const liquidationStateAddress = deriveLiquidationState(loanAddress);
  const [repaymentStreamAccount, liquidationStateAccount] = await Promise.all([
    connection.getAccountInfo(repaymentStreamAddress, "confirmed"),
    connection.getAccountInfo(liquidationStateAddress, "confirmed"),
  ]);

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

  const liquidationState = liquidationStateAccount
    ? (() => {
        const data = liquidationStateAccount.data;
        const warningIssuedAt = Number(readI64(data, 40));
        const graceSeconds = Number(readI64(data, 48));
        const graceEndsAt = warningIssuedAt + graceSeconds;
        const now = Math.floor(Date.now() / 1000);

        return {
          address: liquidationStateAddress.toBase58(),
          collateralValueUsdc: uiUsdc(readU64(data, 56)),
          liquidationThresholdUsdc: uiUsdc(readU64(data, 64)),
          recoveredUsdc: uiUsdc(readU64(data, 72)),
          warningActive: data[80] === 1,
          graceEndsAt: formatDateTime(graceEndsAt),
          graceEndsAtUnix: graceEndsAt,
          canExecute: data[80] === 1 && now >= graceEndsAt,
        };
      })()
    : null;

  return { creditProof, loan, repaymentStream, liquidationState };
}
