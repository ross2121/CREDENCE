import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { DEFAULT_PROGRAM_ID, loadProgram } from "./devnet-axiom-utils";

async function main() {
  const programId = new PublicKey(
    process.env.AXIOM_PROGRAM_ID ?? DEFAULT_PROGRAM_ID
  );
  const loan = new PublicKey(process.env.LOAN ?? "");
  const collateralValueUsdc = Number(process.env.COLLATERAL_VALUE_USDC ?? 0.05);
  const loanValueUsdc = Number(process.env.LOAN_VALUE_USDC ?? 0.1);
  const { connection, program, provider, wallet } = await loadProgram();
  const [liquidationState] = PublicKey.findProgramAddressSync(
    [Buffer.from("liquidation"), loan.toBuffer()],
    programId
  );

  const existing = await connection.getAccountInfo(liquidationState, "confirmed");
  if (existing) {
    console.log("Liquidation warning already exists");
    console.log("Loan:", loan.toBase58());
    console.log("Liquidation state:", liquidationState.toBase58());
    return;
  }

  const signature = await program.methods
    .issueLiquidationWarning(
      new anchor.BN(Math.floor(collateralValueUsdc * 1_000_000)),
      new anchor.BN(Math.floor(loanValueUsdc * 1_000_000))
    )
    .accounts({
      authority: wallet.publicKey,
      loan,
      liquidationState,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const latestBlockhash = await provider.connection.getLatestBlockhash("confirmed");
  await provider.connection.confirmTransaction(
    { signature, ...latestBlockhash },
    "confirmed"
  );

  console.log("AXIOM devnet liquidation warning issued");
  console.log("Loan:", loan.toBase58());
  console.log("Liquidation state:", liquidationState.toBase58());
  console.log("Collateral value:", collateralValueUsdc);
  console.log("Loan value:", loanValueUsdc);
  console.log("Grace period seconds: 3600");
  console.log("Signature:", signature);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
