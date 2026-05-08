import { PublicKey } from "@solana/web3.js";
import {
  DEFAULT_PROGRAM_ID,
  DEFAULT_USDC_MINT,
  DEFAULT_USDC_VAULT,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  loadProgram,
} from "./devnet-axiom-utils";

async function main() {
  const programId = new PublicKey(
    process.env.AXIOM_PROGRAM_ID ?? DEFAULT_PROGRAM_ID
  );
  const usdcMint = new PublicKey(process.env.USDC_MINT ?? DEFAULT_USDC_MINT);
  const destinationUsdt = new PublicKey(
    process.env.DESTINATION_USDT ?? DEFAULT_USDC_VAULT
  );
  const loan = new PublicKey(process.env.LOAN ?? "");
  const { program, provider, wallet } = await loadProgram();
  const [repaymentStream] = PublicKey.findProgramAddressSync(
    [Buffer.from("repayment_stream"), loan.toBuffer()],
    programId
  );
  const streamVault = getAssociatedTokenAddress(usdcMint, repaymentStream);

  const signature = await program.methods
    .claimRepayments()
    .accounts({
      claimant: wallet.publicKey,
      destinationUsdt,
      loan,
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

  console.log("AXIOM devnet repayments claimed");
  console.log("Loan:", loan.toBase58());
  console.log("Repayment stream:", repaymentStream.toBase58());
  console.log("Destination USDC:", destinationUsdt.toBase58());
  console.log("Signature:", signature);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
