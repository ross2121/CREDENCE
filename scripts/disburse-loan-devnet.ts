import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  DEFAULT_PROGRAM_ID,
  DEFAULT_USDC_MINT,
  DEFAULT_USDC_VAULT,
  TOKEN_PROGRAM_ID,
  ensureAssociatedTokenAccount,
  loadProgram,
} from "./devnet-axiom-utils";

async function main() {
  const programId = new PublicKey(
    process.env.AXIOM_PROGRAM_ID ?? DEFAULT_PROGRAM_ID
  );
  const usdtVault = new PublicKey(
    process.env.USDT_VAULT ?? DEFAULT_USDC_VAULT
  );
  const usdcMint = new PublicKey(process.env.USDC_MINT ?? DEFAULT_USDC_MINT);
  const loan = new PublicKey(process.env.LOAN ?? "");
  const borrower = new PublicKey(process.env.BORROWER ?? "");
  const { connection, program, provider, wallet } = await loadProgram();
  const [lendingPool] = PublicKey.findProgramAddressSync(
    [Buffer.from("lending_pool"), usdtVault.toBuffer()],
    programId
  );
  const [collateralEscrow] = PublicKey.findProgramAddressSync(
    [Buffer.from("collateral_escrow"), loan.toBuffer()],
    programId
  );

  const { ata: borrowerUsdt, instruction } = await ensureAssociatedTokenAccount(
    connection,
    wallet.publicKey,
    usdcMint,
    borrower
  );

  const transaction = new Transaction();
  if (instruction) transaction.add(instruction);
  transaction.add(
    await program.methods
      .disburseLoan()
      .accounts({
        authority: wallet.publicKey,
        borrowerUsdt,
        lendingPool,
        usdtVault,
        loan,
        collateralEscrow,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction()
  );

  const signature = await provider.sendAndConfirm(transaction);
  console.log("AXIOM devnet loan disbursed");
  console.log("Borrower:", borrower.toBase58());
  console.log("Borrower USDC ATA:", borrowerUsdt.toBase58());
  console.log("Loan:", loan.toBase58());
  console.log("Collateral escrow:", collateralEscrow.toBase58());
  console.log("Signature:", signature);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
