import { readFileSync } from "fs";
import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import bs58 from "bs58";

export const runtime = "nodejs";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);
const DISBURSE_LOAN_DISCRIMINATOR = Uint8Array.from([
  115, 159, 152, 253, 201, 29, 29, 174,
]);

function devnetConfig() {
  const usdcVault = new PublicKey(
    process.env.NEXT_PUBLIC_AXIOM_USDC_VAULT ??
      "AaywYs28UTX946bnaXya79GP9X6tj2ScVeb9Z1UHKQa6"
  );
  return {
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com",
    programId: new PublicKey(
      process.env.NEXT_PUBLIC_AXIOM_PROGRAM_ID ??
        "6Xrd8Ymz9vxecWjifKern6LAzXQ2XKcS4D1zsJ8ENLpK"
    ),
    lendingPool: new PublicKey(
      process.env.NEXT_PUBLIC_AXIOM_LENDING_POOL ??
        "9vWqdDc68HmMijbbDviYmHYPo96Ru2FSL9CYbg22Guiu"
    ),
    usdcVault,
    usdcMint: new PublicKey(
      process.env.NEXT_PUBLIC_USDC_MINT ??
        "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
    ),
  };
}

function readPubkey(data: Uint8Array, offset: number) {
  return new PublicKey(data.slice(offset, offset + 32));
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

function loadAgentKeypair() {
  const inlineSecret =
    process.env.AXIOM_POOL_AGENT_SECRET_KEY ??
    process.env.AXIOM_POOL_AUTHORITY_SECRET_KEY;
  const keypairPath =
    process.env.AXIOM_POOL_AGENT_KEYPAIR_PATH ??
    process.env.ANCHOR_PROVIDER_WALLET;

  if (inlineSecret) {
    const trimmed = inlineSecret.trim();
    const bytes = trimmed.startsWith("[")
      ? Uint8Array.from(JSON.parse(trimmed) as number[])
      : bs58.decode(trimmed);
    return Keypair.fromSecretKey(bytes);
  }

  if (keypairPath) {
    return Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(readFileSync(keypairPath, "utf8")) as number[])
    );
  }

  throw new Error(
    "Pool agent key is missing. Set AXIOM_POOL_AGENT_SECRET_KEY or AXIOM_POOL_AGENT_KEYPAIR_PATH."
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      loan?: string;
      borrower?: string;
    };
    if (!body.loan || !body.borrower) {
      return NextResponse.json(
        { error: "loan and borrower are required" },
        { status: 400 }
      );
    }

    const config = devnetConfig();
    const connection = new Connection(config.rpcUrl, "confirmed");
    const agent = loadAgentKeypair();
    const loan = new PublicKey(body.loan);
    const borrower = new PublicKey(body.borrower);
    const borrowerUsdc = getAssociatedTokenAddress(config.usdcMint, borrower);
    const [collateralEscrow] = PublicKey.findProgramAddressSync(
      [Buffer.from("collateral_escrow"), loan.toBuffer()],
      config.programId
    );
    const [poolAccount, loanAccount, borrowerUsdcAccount] = await Promise.all([
      connection.getAccountInfo(config.lendingPool, "confirmed"),
      connection.getAccountInfo(loan, "confirmed"),
      connection.getAccountInfo(borrowerUsdc, "confirmed"),
    ]);

    if (!poolAccount) throw new Error("AXIOM lending pool account not found");
    if (!loanAccount) throw new Error("Loan account not found");

    const poolAuthority = readPubkey(poolAccount.data, 8);
    if (!poolAuthority.equals(agent.publicKey)) {
      throw new Error(
        `Configured pool agent ${agent.publicKey.toBase58()} does not match pool authority ${poolAuthority.toBase58()}`
      );
    }

    const loanBorrower = readPubkey(loanAccount.data, 8);
    if (!loanBorrower.equals(borrower)) {
      throw new Error("Submitted borrower does not match the loan account");
    }

    const streamRate = new DataView(
      loanAccount.data.buffer,
      loanAccount.data.byteOffset + 161,
      8
    ).getBigUint64(0, true);
    if (streamRate > BigInt(0)) {
      return NextResponse.json({
        skipped: true,
        message: "Loan is already disbursed",
      });
    }

    const transaction = new Transaction();
    if (!borrowerUsdcAccount) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          agent.publicKey,
          borrowerUsdc,
          borrower,
          config.usdcMint
        )
      );
    }
    transaction.add(
      new TransactionInstruction({
        programId: config.programId,
        keys: [
          { pubkey: agent.publicKey, isSigner: true, isWritable: true },
          { pubkey: borrowerUsdc, isSigner: false, isWritable: true },
          { pubkey: config.lendingPool, isSigner: false, isWritable: true },
          { pubkey: config.usdcVault, isSigner: false, isWritable: true },
          { pubkey: loan, isSigner: false, isWritable: true },
          { pubkey: collateralEscrow, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        data: Buffer.from(DISBURSE_LOAN_DISCRIMINATOR),
      })
    );

    transaction.feePayer = agent.publicKey;
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash("confirmed")
    ).blockhash;

    const simulation = await connection.simulateTransaction(transaction, [
      agent,
    ]);
    if (simulation.value.err) {
      throw new Error(
        `Agent simulation failed: ${JSON.stringify(simulation.value.err)}\n${
          simulation.value.logs?.join("\n") ?? "No simulation logs"
        }`
      );
    }

    transaction.sign(agent);
    const signature = await connection.sendRawTransaction(
      transaction.serialize()
    );
    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction(
      { signature, ...latestBlockhash },
      "confirmed"
    );

    return NextResponse.json({
      signature,
      agent: agent.publicKey.toBase58(),
      loan: loan.toBase58(),
      borrower: borrower.toBase58(),
    });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Agent failed" },
      { status: 500 }
    );
  }
}
