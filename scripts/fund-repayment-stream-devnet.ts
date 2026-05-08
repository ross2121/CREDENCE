import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  DEFAULT_PROGRAM_ID,
  DEFAULT_USDC_MINT,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  loadProgram,
} from "./devnet-axiom-utils";

async function main() {
  const programId = new PublicKey(
    process.env.AXIOM_PROGRAM_ID ?? DEFAULT_PROGRAM_ID
  );
  const usdcMint = new PublicKey(process.env.USDC_MINT ?? DEFAULT_USDC_MINT);
  const loan = new PublicKey(process.env.LOAN ?? "");
  const amountUsdc = Number(process.env.REPAY_USDT ?? 1);
  const { program, provider, wallet } = await loadProgram();
  const [repaymentStream] = PublicKey.findProgramAddressSync(
    [Buffer.from("repayment_stream"), loan.toBuffer()],
    programId
  );
  const borrowerUsdt = getAssociatedTokenAddress(usdcMint, wallet.publicKey);
  const streamVault = getAssociatedTokenAddress(usdcMint, repaymentStream);

  const signature = await program.methods
    .fundRepaymentStream(new anchor.BN(Math.floor(amountUsdc * 1_000_000)))
    .accounts({
      borrower: wallet.publicKey,
      borrowerUsdt,
      repaymentStream,
      streamVault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  const latestBlockhash = await provider.connection.getLatestBlockhash("confirmed");
  await provider.connection.confirmTransaction(
    { signature, ...latestBlockhash },
    "confirmed"
  );

  console.log("AXIOM devnet repayment stream funded");
  console.log("Loan:", loan.toBase58());
  console.log("Repayment stream:", repaymentStream.toBase58());
  console.log("Borrower USDC ATA:", borrowerUsdt.toBase58());
  console.log("Amount:", amountUsdc);
  console.log("Signature:", signature);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
