"use client";

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import { Buffer } from "buffer";
import {
  deriveCollateralEscrow,
  deriveCollateralVault,
  deriveCreditProof,
  deriveLiquidationState,
  deriveLoan,
  deriveRepaymentStream,
  deriveReputation,
} from "@/lib/borrower-state";
import { AXIOM_DEVNET } from "@/lib/devnet-pool";
import { deriveIkaPolicy } from "@/lib/policy-state";
import {
  DEVNET_SILVER_PROOF_BASE64,
  DEVNET_SILVER_PUBLIC_INPUTS,
} from "@/lib/zk-fixture";

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
const INITIALIZE_LENDER_POSITION_DISCRIMINATOR = Uint8Array.from([
  118, 106, 247, 249, 249, 35, 148, 205,
]);
const REGISTER_CREDIT_PROOF_DISCRIMINATOR = Uint8Array.from([
  132, 34, 139, 212, 102, 194, 233, 244,
]);
const REQUEST_LOAN_DISCRIMINATOR = Uint8Array.from([
  120, 2, 7, 7, 1, 219, 235, 187,
]);
const MINT_REPUTATION_NFT_DISCRIMINATOR = Uint8Array.from([
  240, 117, 21, 198, 77, 214, 150, 128,
]);
const INITIALIZE_IKA_POLICY_DISCRIMINATOR = Uint8Array.from([
  210, 26, 40, 85, 131, 201, 170, 12,
]);
const DISBURSE_LOAN_DISCRIMINATOR = Uint8Array.from([
  115, 159, 152, 253, 201, 29, 29, 174,
]);
const INIT_REPAYMENT_STREAM_DISCRIMINATOR = Uint8Array.from([
  77, 9, 219, 144, 154, 78, 1, 154,
]);
const FUND_REPAYMENT_STREAM_DISCRIMINATOR = Uint8Array.from([
  111, 174, 212, 231, 145, 102, 72, 165,
]);
const FUND_REPAYMENT_STREAM_WITH_POLICY_DISCRIMINATOR = Uint8Array.from([
  176, 59, 216, 31, 138, 209, 126, 204,
]);
const CLAIM_REPAYMENTS_DISCRIMINATOR = Uint8Array.from([
  237, 82, 234, 34, 156, 45, 222, 16,
]);
const CLOSE_REPAYMENT_STREAM_DISCRIMINATOR = Uint8Array.from([
  204, 226, 222, 155, 254, 72, 103, 131,
]);
const ISSUE_LIQUIDATION_WARNING_DISCRIMINATOR = Uint8Array.from([
  190, 172, 138, 114, 56, 191, 120, 132,
]);
const EXECUTE_LIQUIDATION_DISCRIMINATOR = Uint8Array.from([
  189, 55, 38, 121, 165, 84, 96, 124,
]);
const DEPOSIT_LENDER_LIQUIDITY_DISCRIMINATOR = Uint8Array.from([
  64, 169, 108, 29, 20, 168, 185, 141,
]);
const WITHDRAW_LENDER_LIQUIDITY_DISCRIMINATOR = Uint8Array.from([
  145, 233, 1, 189, 248, 140, 148, 83,
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

function encodeU32(value: number) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function encodeU64(value: bigint) {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, value, true);
  return bytes;
}

function encodeI64(value: bigint) {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigInt64(0, value, true);
  return bytes;
}

function encodeBool(value: boolean) {
  return Uint8Array.from([value ? 1 : 0]);
}

function encodeOriginChain(chain: string) {
  const bytes = new Uint8Array(16);
  new TextEncoder().encode(chain.slice(0, 16)).forEach((byte, index) => {
    bytes[index] = byte;
  });
  return bytes;
}

function noArgsData(discriminator: Uint8Array) {
  return Buffer.from(discriminator);
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

function createAssociatedTokenAccountInstruction(
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

function getLenderPosition(lender: PublicKey) {
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

async function ensureAssociatedTokenAccount(
  transaction: Transaction,
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey
) {
  const ata = getAssociatedTokenAddress(mint, owner);
  const existing = await connection.getAccountInfo(ata, "confirmed");
  if (!existing) {
    transaction.add(
      createAssociatedTokenAccountInstruction(payer, ata, owner, mint)
    );
  }
  return ata;
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
  const lenderPosition = getLenderPosition(wallet.publicKey);
  const sourceAccount = await connection.getAccountInfo(
    lenderUsdc,
    "confirmed"
  );
  if (!sourceAccount) {
    throw new Error(
      `No devnet USDC token account found for this wallet: ${lenderUsdc.toBase58()}`
    );
  }

  const transaction = new Transaction();
  const positionAccount = await connection.getAccountInfo(
    lenderPosition,
    "confirmed"
  );
  if (!positionAccount) {
    transaction.add(
      new TransactionInstruction({
        programId: AXIOM_DEVNET.programId,
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          {
            pubkey: AXIOM_DEVNET.lendingPool,
            isSigner: false,
            isWritable: false,
          },
          { pubkey: lenderPosition, isSigner: false, isWritable: true },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
        ],
        data: Buffer.from(INITIALIZE_LENDER_POSITION_DISCRIMINATOR),
      })
    );
  }

  transaction.add(
    new TransactionInstruction({
      programId: AXIOM_DEVNET.programId,
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: lenderUsdc, isSigner: false, isWritable: true },
        { pubkey: AXIOM_DEVNET.lendingPool, isSigner: false, isWritable: true },
        { pubkey: AXIOM_DEVNET.usdcVault, isSigner: false, isWritable: true },
        { pubkey: lenderPosition, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: amountData(DEPOSIT_LENDER_LIQUIDITY_DISCRIMINATOR, amountUsdc),
    })
  );

  return sendAndConfirm(connection, wallet, transaction);
}

export async function withdrawLiquidityToWallet({
  amountUsdc,
  connection,
  wallet,
}: {
  amountUsdc: number;
  connection: Connection;
  wallet: WalletContextState;
}) {
  if (!wallet.publicKey) throw new Error("Connect a wallet first");

  const destinationUsdc = getAssociatedTokenAddress(
    AXIOM_DEVNET.usdcMint,
    wallet.publicKey
  );
  const lenderPosition = getLenderPosition(wallet.publicKey);
  const [destinationAccount, positionAccount] = await Promise.all([
    connection.getAccountInfo(destinationUsdc, "confirmed"),
    connection.getAccountInfo(lenderPosition, "confirmed"),
  ]);

  if (!destinationAccount) {
    throw new Error(
      `No devnet USDC token account found for this wallet: ${destinationUsdc.toBase58()}`
    );
  }
  if (!positionAccount) {
    throw new Error("No AXIOM lender position exists for this wallet yet");
  }

  const ix = new TransactionInstruction({
    programId: AXIOM_DEVNET.programId,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: destinationUsdc, isSigner: false, isWritable: true },
      { pubkey: AXIOM_DEVNET.lendingPool, isSigner: false, isWritable: true },
      { pubkey: AXIOM_DEVNET.usdcVault, isSigner: false, isWritable: true },
      { pubkey: lenderPosition, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: amountData(WITHDRAW_LENDER_LIQUIDITY_DISCRIMINATOR, amountUsdc),
  });

  return sendAndConfirm(connection, wallet, new Transaction().add(ix));
}

export async function registerFixtureCreditProof({
  connection,
  wallet,
}: {
  connection: Connection;
  wallet: WalletContextState;
}) {
  if (!wallet.publicKey) throw new Error("Connect a wallet first");

  const creditProof = deriveCreditProof(wallet.publicKey);
  const existing = await connection.getAccountInfo(creditProof, "confirmed");
  if (existing) {
    throw new Error("Credit proof already exists for this wallet");
  }

  const proofBytes = Uint8Array.from(
    Buffer.from(DEVNET_SILVER_PROOF_BASE64, "base64")
  );
  const publicInputs = DEVNET_SILVER_PUBLIC_INPUTS.map((input) =>
    Uint8Array.from(input)
  );
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);

  const data = new Uint8Array(
    8 + 1 + 8 + 4 + proofBytes.length + 4 + publicInputs.length * 32 + 8
  );
  let offset = 0;
  data.set(REGISTER_CREDIT_PROOF_DISCRIMINATOR, offset);
  offset += 8;
  data[offset] = 1;
  offset += 1;
  data.set(encodeU64(BigInt(2_000_000_000)), offset);
  offset += 8;
  data.set(encodeU32(proofBytes.length), offset);
  offset += 4;
  data.set(proofBytes, offset);
  offset += proofBytes.length;
  data.set(encodeU32(publicInputs.length), offset);
  offset += 4;
  publicInputs.forEach((input) => {
    data.set(input, offset);
    offset += 32;
  });
  data.set(encodeI64(expiry), offset);

  const ix = new TransactionInstruction({
    programId: AXIOM_DEVNET.programId,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: creditProof, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  return sendAndConfirm(connection, wallet, new Transaction().add(ix));
}

export async function requestLoanFromWallet({
  amountUsdc,
  durationDays,
  collateralUsdc,
  connection,
  wallet,
}: {
  amountUsdc: number;
  durationDays: number;
  collateralUsdc: number;
  connection: Connection;
  wallet: WalletContextState;
}) {
  if (!wallet.publicKey) throw new Error("Connect a wallet first");

  const creditProof = deriveCreditProof(wallet.publicKey);
  const proofAccount = await connection.getAccountInfo(creditProof, "confirmed");
  if (!proofAccount) {
    throw new Error("Register a credit proof before requesting a loan");
  }

  const loan = deriveLoan(wallet.publicKey, creditProof);
  const collateralEscrow = deriveCollateralEscrow(loan);
  const collateralVault = deriveCollateralVault(loan);
  const borrowerCollateral = getAssociatedTokenAddress(
    AXIOM_DEVNET.usdcMint,
    wallet.publicKey
  );
  const borrowerCollateralAccount = await connection.getAccountInfo(
    borrowerCollateral,
    "confirmed"
  );
  if (!borrowerCollateralAccount) {
    throw new Error(
      `No devnet USDC collateral account found for this wallet: ${borrowerCollateral.toBase58()}`
    );
  }

  const data = new Uint8Array(8 + 8 + 8 + 8 + 32);
  let offset = 0;
  data.set(REQUEST_LOAN_DISCRIMINATOR, offset);
  offset += 8;
  data.set(encodeU64(BigInt(Math.floor(amountUsdc * 1_000_000))), offset);
  offset += 8;
  data.set(encodeU64(BigInt(durationDays)), offset);
  offset += 8;
  data.set(encodeU64(BigInt(Math.floor(collateralUsdc * 1_000_000))), offset);
  offset += 8;
  data.set(wallet.publicKey.toBytes(), offset);

  const ix = new TransactionInstruction({
    programId: AXIOM_DEVNET.programId,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: creditProof, isSigner: false, isWritable: false },
      { pubkey: AXIOM_DEVNET.usdcMint, isSigner: false, isWritable: false },
      { pubkey: borrowerCollateral, isSigner: false, isWritable: true },
      { pubkey: loan, isSigner: false, isWritable: true },
      { pubkey: collateralEscrow, isSigner: false, isWritable: true },
      { pubkey: collateralVault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  return sendAndConfirm(connection, wallet, new Transaction().add(ix));
}

export async function initializeBorrowerPrivyPolicyFromWallet({
  delegatedWallet,
  maxAmountUsdc,
  streamVault,
  connection,
  wallet,
}: {
  delegatedWallet: PublicKey;
  maxAmountUsdc: number;
  streamVault: PublicKey;
  connection: Connection;
  wallet: WalletContextState;
}) {
  if (!wallet.publicKey) throw new Error("Connect a wallet first");

  const ikaPolicy = deriveIkaPolicy(wallet.publicKey, delegatedWallet);
  const existing = await connection.getAccountInfo(ikaPolicy, "confirmed");
  if (existing) {
    throw new Error("Borrower policy already exists for this delegated wallet");
  }

  const emptyPubkey = PublicKey.default.toBytes();
  const data = new Uint8Array(8 + 1 + 96 + 1 + 8 + 1 + 16);
  let offset = 0;
  data.set(INITIALIZE_IKA_POLICY_DISCRIMINATOR, offset);
  offset += 8;
  data[offset] = 0;
  offset += 1;
  data.set(streamVault.toBytes(), offset);
  offset += 32;
  data.set(emptyPubkey, offset);
  offset += 32;
  data.set(emptyPubkey, offset);
  offset += 32;
  data[offset] = 1;
  offset += 1;
  data.set(encodeU64(BigInt(Math.floor(maxAmountUsdc * 1_000_000))), offset);
  offset += 8;
  data.set(encodeBool(false), offset);
  offset += 1;
  data.set(encodeOriginChain("solana"), offset);

  const ix = new TransactionInstruction({
    programId: AXIOM_DEVNET.programId,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: ikaPolicy, isSigner: false, isWritable: true },
      { pubkey: delegatedWallet, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  return sendAndConfirm(connection, wallet, new Transaction().add(ix));
}

export async function mintReputationFromWallet({
  connection,
  wallet,
}: {
  connection: Connection;
  wallet: WalletContextState;
}) {
  if (!wallet.publicKey) throw new Error("Connect a wallet first");

  const reputation = deriveReputation(wallet.publicKey);
  const existing = await connection.getAccountInfo(reputation, "confirmed");
  if (existing) {
    throw new Error("Reputation account already exists for this wallet");
  }

  const ix = new TransactionInstruction({
    programId: AXIOM_DEVNET.programId,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: PublicKey.default, isSigner: false, isWritable: false },
      { pubkey: reputation, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: noArgsData(MINT_REPUTATION_NFT_DISCRIMINATOR),
  });

  return sendAndConfirm(connection, wallet, new Transaction().add(ix));
}

export async function disburseLoanFromWallet({
  borrower,
  loan,
  connection,
  wallet,
}: {
  borrower: PublicKey;
  loan: PublicKey;
  connection: Connection;
  wallet: WalletContextState;
}) {
  if (!wallet.publicKey) throw new Error("Connect a wallet first");

  const transaction = new Transaction();
  const borrowerUsdc = await ensureAssociatedTokenAccount(
    transaction,
    connection,
    wallet.publicKey,
    AXIOM_DEVNET.usdcMint,
    borrower
  );

  transaction.add(
    new TransactionInstruction({
      programId: AXIOM_DEVNET.programId,
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: borrowerUsdc, isSigner: false, isWritable: true },
        { pubkey: AXIOM_DEVNET.lendingPool, isSigner: false, isWritable: true },
        { pubkey: AXIOM_DEVNET.usdcVault, isSigner: false, isWritable: true },
        { pubkey: loan, isSigner: false, isWritable: true },
        {
          pubkey: deriveCollateralEscrow(loan),
          isSigner: false,
          isWritable: false,
        },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: noArgsData(DISBURSE_LOAN_DISCRIMINATOR),
    })
  );

  return sendAndConfirm(connection, wallet, transaction);
}

export async function initRepaymentStreamFromWallet({
  loan,
  connection,
  wallet,
}: {
  loan: PublicKey;
  connection: Connection;
  wallet: WalletContextState;
}) {
  if (!wallet.publicKey) throw new Error("Connect a wallet first");

  const repaymentStream = deriveRepaymentStream(loan);
  const existingStream = await connection.getAccountInfo(
    repaymentStream,
    "confirmed"
  );
  if (existingStream) {
    throw new Error("Repayment stream already exists for this loan");
  }

  const transaction = new Transaction();
  const streamVault = await ensureAssociatedTokenAccount(
    transaction,
    connection,
    wallet.publicKey,
    AXIOM_DEVNET.usdcMint,
    repaymentStream
  );

  transaction.add(
    new TransactionInstruction({
      programId: AXIOM_DEVNET.programId,
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: loan, isSigner: false, isWritable: false },
        { pubkey: streamVault, isSigner: false, isWritable: false },
        { pubkey: repaymentStream, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: noArgsData(INIT_REPAYMENT_STREAM_DISCRIMINATOR),
    })
  );

  return sendAndConfirm(connection, wallet, transaction);
}

export async function fundRepaymentStreamFromWallet({
  loan,
  amountUsdc,
  connection,
  wallet,
}: {
  loan: PublicKey;
  amountUsdc: number;
  connection: Connection;
  wallet: WalletContextState;
}) {
  if (!wallet.publicKey) throw new Error("Connect a wallet first");

  const repaymentStream = deriveRepaymentStream(loan);
  const streamAccount = await connection.getAccountInfo(
    repaymentStream,
    "confirmed"
  );
  if (!streamAccount) {
    throw new Error("Initialize the repayment stream before funding it");
  }

  const borrowerUsdc = getAssociatedTokenAddress(
    AXIOM_DEVNET.usdcMint,
    wallet.publicKey
  );
  const borrowerAccount = await connection.getAccountInfo(
    borrowerUsdc,
    "confirmed"
  );
  if (!borrowerAccount) {
    throw new Error(
      `No devnet USDC token account found for this wallet: ${borrowerUsdc.toBase58()}`
    );
  }

  const streamVault = getAssociatedTokenAddress(
    AXIOM_DEVNET.usdcMint,
    repaymentStream
  );
  const ix = new TransactionInstruction({
    programId: AXIOM_DEVNET.programId,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: borrowerUsdc, isSigner: false, isWritable: true },
      { pubkey: repaymentStream, isSigner: false, isWritable: true },
      { pubkey: streamVault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: amountData(FUND_REPAYMENT_STREAM_DISCRIMINATOR, amountUsdc),
  });

  return sendAndConfirm(connection, wallet, new Transaction().add(ix));
}

export async function buildFundRepaymentStreamWithPolicyTransaction({
  owner,
  delegatedWallet,
  loan,
  amountUsdc,
  connection,
}: {
  owner: PublicKey;
  delegatedWallet: PublicKey;
  loan: PublicKey;
  amountUsdc: number;
  connection: Connection;
}) {
  const transaction = new Transaction();
  const repaymentStream = deriveRepaymentStream(loan);
  const streamAccount = await connection.getAccountInfo(
    repaymentStream,
    "confirmed"
  );
  if (!streamAccount) {
    throw new Error("Initialize the repayment stream before delegated funding");
  }

  const agentUsdc = await ensureAssociatedTokenAccount(
    transaction,
    connection,
    delegatedWallet,
    AXIOM_DEVNET.usdcMint,
    delegatedWallet
  );
  const streamVault = getAssociatedTokenAddress(
    AXIOM_DEVNET.usdcMint,
    repaymentStream
  );
  const ikaPolicy = deriveIkaPolicy(owner, delegatedWallet);

  transaction.add(
    new TransactionInstruction({
      programId: AXIOM_DEVNET.programId,
      keys: [
        { pubkey: delegatedWallet, isSigner: true, isWritable: true },
        { pubkey: agentUsdc, isSigner: false, isWritable: true },
        { pubkey: loan, isSigner: false, isWritable: false },
        { pubkey: repaymentStream, isSigner: false, isWritable: true },
        { pubkey: streamVault, isSigner: false, isWritable: true },
        { pubkey: ikaPolicy, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: amountData(
        FUND_REPAYMENT_STREAM_WITH_POLICY_DISCRIMINATOR,
        amountUsdc
      ),
    })
  );

  transaction.feePayer = delegatedWallet;
  transaction.recentBlockhash = (
    await connection.getLatestBlockhash("confirmed")
  ).blockhash;
  return transaction;
}

export async function claimRepaymentsToPoolFromWallet({
  loan,
  connection,
  wallet,
}: {
  loan: PublicKey;
  connection: Connection;
  wallet: WalletContextState;
}) {
  if (!wallet.publicKey) throw new Error("Connect a wallet first");

  const repaymentStream = deriveRepaymentStream(loan);
  const streamAccount = await connection.getAccountInfo(
    repaymentStream,
    "confirmed"
  );
  if (!streamAccount) {
    throw new Error("Repayment stream has not been initialized");
  }

  const streamVault = getAssociatedTokenAddress(
    AXIOM_DEVNET.usdcMint,
    repaymentStream
  );
  const ix = new TransactionInstruction({
    programId: AXIOM_DEVNET.programId,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: AXIOM_DEVNET.usdcVault, isSigner: false, isWritable: true },
      { pubkey: loan, isSigner: false, isWritable: true },
      { pubkey: repaymentStream, isSigner: false, isWritable: true },
      { pubkey: streamVault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: noArgsData(CLAIM_REPAYMENTS_DISCRIMINATOR),
  });

  return sendAndConfirm(connection, wallet, new Transaction().add(ix));
}

export async function closeRepaymentStreamFromWallet({
  loan,
  connection,
  wallet,
}: {
  loan: PublicKey;
  connection: Connection;
  wallet: WalletContextState;
}) {
  if (!wallet.publicKey) throw new Error("Connect a wallet first");

  const repaymentStream = deriveRepaymentStream(loan);
  const streamAccount = await connection.getAccountInfo(
    repaymentStream,
    "confirmed"
  );
  if (!streamAccount) {
    throw new Error("Repayment stream has not been initialized");
  }

  const ix = new TransactionInstruction({
    programId: AXIOM_DEVNET.programId,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: loan, isSigner: false, isWritable: true },
      { pubkey: repaymentStream, isSigner: false, isWritable: true },
      {
        pubkey: deriveCollateralEscrow(loan),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: deriveCollateralVault(loan), isSigner: false, isWritable: true },
      {
        pubkey: getAssociatedTokenAddress(AXIOM_DEVNET.usdcMint, wallet.publicKey),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: noArgsData(CLOSE_REPAYMENT_STREAM_DISCRIMINATOR),
  });

  return sendAndConfirm(connection, wallet, new Transaction().add(ix));
}

export async function issueLiquidationWarningFromWallet({
  loan,
  collateralValueUsdc,
  loanValueUsdc,
  connection,
  wallet,
}: {
  loan: PublicKey;
  collateralValueUsdc: number;
  loanValueUsdc: number;
  connection: Connection;
  wallet: WalletContextState;
}) {
  if (!wallet.publicKey) throw new Error("Connect a wallet first");

  const liquidationState = deriveLiquidationState(loan);
  const existing = await connection.getAccountInfo(liquidationState, "confirmed");
  if (existing) {
    throw new Error("Liquidation warning already exists for this loan");
  }

  const data = new Uint8Array(24);
  data.set(ISSUE_LIQUIDATION_WARNING_DISCRIMINATOR, 0);
  data.set(encodeU64(BigInt(Math.floor(collateralValueUsdc * 1_000_000))), 8);
  data.set(encodeU64(BigInt(Math.floor(loanValueUsdc * 1_000_000))), 16);

  const ix = new TransactionInstruction({
    programId: AXIOM_DEVNET.programId,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: loan, isSigner: false, isWritable: false },
      { pubkey: liquidationState, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  return sendAndConfirm(connection, wallet, new Transaction().add(ix));
}

export async function executeLiquidationFromWallet({
  borrower,
  loan,
  connection,
  wallet,
}: {
  borrower: PublicKey;
  loan: PublicKey;
  connection: Connection;
  wallet: WalletContextState;
}) {
  if (!wallet.publicKey) throw new Error("Connect a wallet first");

  const liquidationState = deriveLiquidationState(loan);
  const collateralEscrow = deriveCollateralEscrow(loan);
  const collateralVault = deriveCollateralVault(loan);
  const reputation = deriveReputation(borrower);
  const reputationAccount = await connection.getAccountInfo(
    reputation,
    "confirmed"
  );
  if (!reputationAccount) {
    throw new Error("Borrower reputation account is missing");
  }

  const data = new Uint8Array(16);
  data.set(EXECUTE_LIQUIDATION_DISCRIMINATOR, 0);
  data.set(encodeU64(BigInt(0)), 8);

  const ix = new TransactionInstruction({
    programId: AXIOM_DEVNET.programId,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
      { pubkey: loan, isSigner: false, isWritable: true },
      { pubkey: liquidationState, isSigner: false, isWritable: true },
      { pubkey: AXIOM_DEVNET.lendingPool, isSigner: false, isWritable: true },
      { pubkey: AXIOM_DEVNET.usdcVault, isSigner: false, isWritable: true },
      { pubkey: collateralEscrow, isSigner: false, isWritable: true },
      { pubkey: collateralVault, isSigner: false, isWritable: true },
      { pubkey: reputation, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
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
