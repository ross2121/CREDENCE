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
  const borrower = new PublicKey(process.env.BORROWER ?? "");
  const amountUsdc = Number(process.env.REPAY_USDT ?? 1);
  const { program, provider, wallet } = await loadProgram();
  const [repaymentStream] = PublicKey.findProgramAddressSync(
    [Buffer.from("repayment_stream"), loan.toBuffer()],
    programId
  );
  const [ikaPolicy] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("ika_policy"),
      borrower.toBuffer(),
      wallet.publicKey.toBuffer(),
    ],
    programId
  );
  const agentUsdt = getAssociatedTokenAddress(usdcMint, wallet.publicKey);
  const streamVault = getAssociatedTokenAddress(usdcMint, repaymentStream);

  const signature = await program.methods
    .fundRepaymentStreamWithPolicy(
      new anchor.BN(Math.floor(amountUsdc * 1_000_000))
    )
    .accounts({
      agentWallet: wallet.publicKey,
      agentUsdt,
      loan,
      repaymentStream,
      streamVault,
      ikaPolicy,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  const latestBlockhash = await provider.connection.getLatestBlockhash("confirmed");
  await provider.connection.confirmTransaction(
    { signature, ...latestBlockhash },
    "confirmed"
  );

  console.log("AXIOM delegated repayment funded");
  console.log("Delegated wallet:", wallet.publicKey.toBase58());
  console.log("Borrower:", borrower.toBase58());
  console.log("Loan:", loan.toBase58());
  console.log("Repayment stream:", repaymentStream.toBase58());
  console.log("Policy:", ikaPolicy.toBase58());
  console.log("Amount:", amountUsdc);
  console.log("Signature:", signature);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
