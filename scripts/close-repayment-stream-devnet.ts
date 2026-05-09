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
  const loan = new PublicKey(process.env.LOAN ?? "");
  const { program, provider, wallet } = await loadProgram();
  const usdcMint = new PublicKey(process.env.USDC_MINT ?? DEFAULT_USDC_MINT);
  const [repaymentStream] = PublicKey.findProgramAddressSync(
    [Buffer.from("repayment_stream"), loan.toBuffer()],
    programId
  );
  const [collateralEscrow] = PublicKey.findProgramAddressSync(
    [Buffer.from("collateral_escrow"), loan.toBuffer()],
    programId
  );
  const [collateralVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("collateral_vault"), loan.toBuffer()],
    programId
  );
  const borrowerCollateral = getAssociatedTokenAddress(usdcMint, wallet.publicKey);

  const signature = await program.methods
    .closeRepaymentStream()
    .accounts({
      borrower: wallet.publicKey,
      loan,
      repaymentStream,
      collateralEscrow,
      collateralVault,
      borrowerCollateral,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  const latestBlockhash = await provider.connection.getLatestBlockhash("confirmed");
  await provider.connection.confirmTransaction(
    { signature, ...latestBlockhash },
    "confirmed"
  );

  console.log("AXIOM devnet repayment stream closed");
  console.log("Loan:", loan.toBase58());
  console.log("Repayment stream:", repaymentStream.toBase58());
  console.log("Collateral escrow:", collateralEscrow.toBase58());
  console.log("Collateral vault:", collateralVault.toBase58());
  console.log("Signature:", signature);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
