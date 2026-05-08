import { PublicKey } from "@solana/web3.js";
import { DEFAULT_PROGRAM_ID, loadProgram } from "./devnet-axiom-utils";

async function main() {
  const programId = new PublicKey(
    process.env.AXIOM_PROGRAM_ID ?? DEFAULT_PROGRAM_ID
  );
  const loan = new PublicKey(process.env.LOAN ?? "");
  const { program, provider, wallet } = await loadProgram();
  const [repaymentStream] = PublicKey.findProgramAddressSync(
    [Buffer.from("repayment_stream"), loan.toBuffer()],
    programId
  );

  const signature = await program.methods
    .closeRepaymentStream()
    .accounts({
      borrower: wallet.publicKey,
      loan,
      repaymentStream,
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
  console.log("Signature:", signature);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
