import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  DEFAULT_PROGRAM_ID,
  DEFAULT_USDC_MINT,
  ensureAssociatedTokenAccount,
  loadProgram,
} from "./devnet-axiom-utils";

async function main() {
  const programId = new PublicKey(
    process.env.AXIOM_PROGRAM_ID ?? DEFAULT_PROGRAM_ID
  );
  const loan = new PublicKey(process.env.LOAN ?? "");
  const { connection, program, provider, wallet } = await loadProgram();
  const usdcMint = new PublicKey(process.env.USDC_MINT ?? DEFAULT_USDC_MINT);
  const [repaymentStream] = PublicKey.findProgramAddressSync(
    [Buffer.from("repayment_stream"), loan.toBuffer()],
    programId
  );

  const { ata: streamVault, instruction } = await ensureAssociatedTokenAccount(
    connection,
    wallet.publicKey,
    usdcMint,
    repaymentStream
  );

  const transaction = new Transaction();
  if (instruction) transaction.add(instruction);
  transaction.add(
    await program.methods
      .initRepaymentStream()
      .accounts({
        borrower: wallet.publicKey,
        loan,
        streamVault,
        repaymentStream,
        systemProgram: SystemProgram.programId,
      })
      .instruction()
  );

  const signature = await provider.sendAndConfirm(transaction);
  console.log("AXIOM devnet repayment stream initialized");
  console.log("Loan:", loan.toBase58());
  console.log("Repayment stream:", repaymentStream.toBase58());
  console.log("Stream vault:", streamVault.toBase58());
  console.log("Signature:", signature);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
