import { PublicKey, SystemProgram } from "@solana/web3.js";
import { DEFAULT_PROGRAM_ID, loadProgram } from "./devnet-axiom-utils";

async function main() {
  const programId = new PublicKey(
    process.env.AXIOM_PROGRAM_ID ?? DEFAULT_PROGRAM_ID
  );
  const nftMint = new PublicKey(process.env.NFT_MINT ?? PublicKey.default);
  const { connection, program, provider, wallet } = await loadProgram();
  const [reputation] = PublicKey.findProgramAddressSync(
    [Buffer.from("reputation"), wallet.publicKey.toBuffer()],
    programId
  );

  const existing = await connection.getAccountInfo(reputation, "confirmed");
  if (existing) {
    console.log("Reputation account already exists");
    console.log("Wallet:", wallet.publicKey.toBase58());
    console.log("Reputation:", reputation.toBase58());
    return;
  }

  const signature = await program.methods
    .mintReputationNft()
    .accounts({
      wallet: wallet.publicKey,
      nftMint,
      reputation,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const latestBlockhash = await provider.connection.getLatestBlockhash("confirmed");
  await provider.connection.confirmTransaction(
    { signature, ...latestBlockhash },
    "confirmed"
  );

  console.log("AXIOM devnet reputation account minted");
  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Reputation:", reputation.toBase58());
  console.log("Signature:", signature);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
