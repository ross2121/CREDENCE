import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  DEFAULT_PROGRAM_ID,
  DEFAULT_USDC_VAULT,
  TOKEN_PROGRAM_ID,
  loadProgram,
} from "./devnet-axiom-utils";

async function main() {
  const programId = new PublicKey(
    process.env.AXIOM_PROGRAM_ID ?? DEFAULT_PROGRAM_ID
  );
  const usdtVault = new PublicKey(
    process.env.USDT_VAULT ?? DEFAULT_USDC_VAULT
  );
  const loan = new PublicKey(process.env.LOAN ?? "");
  const borrower = new PublicKey(process.env.BORROWER ?? "");
  const recoveredUsdc = Number(process.env.RECOVERED_USDC ?? 0);
  const { program, provider, wallet } = await loadProgram();
  const [lendingPool] = PublicKey.findProgramAddressSync(
    [Buffer.from("lending_pool"), usdtVault.toBuffer()],
    programId
  );
  const [liquidationState] = PublicKey.findProgramAddressSync(
    [Buffer.from("liquidation"), loan.toBuffer()],
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
  const [reputation] = PublicKey.findProgramAddressSync(
    [Buffer.from("reputation"), borrower.toBuffer()],
    programId
  );

  const signature = await program.methods
    .executeLiquidation(new anchor.BN(Math.floor(recoveredUsdc * 1_000_000)))
    .accounts({
      authority: wallet.publicKey,
      loan,
      liquidationState,
      lendingPool,
      usdtVault,
      collateralEscrow,
      collateralVault,
      reputation,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  const latestBlockhash = await provider.connection.getLatestBlockhash("confirmed");
  await provider.connection.confirmTransaction(
    { signature, ...latestBlockhash },
    "confirmed"
  );

  console.log("AXIOM devnet liquidation executed");
  console.log("Borrower:", borrower.toBase58());
  console.log("Loan:", loan.toBase58());
  console.log("Liquidation state:", liquidationState.toBase58());
  console.log("Collateral escrow:", collateralEscrow.toBase58());
  console.log("Collateral vault:", collateralVault.toBase58());
  console.log("Signature:", signature);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
