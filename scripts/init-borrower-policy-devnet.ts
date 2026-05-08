import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  DEFAULT_PROGRAM_ID,
  loadProgram,
} from "./devnet-axiom-utils";

function originChain(name: string) {
  const out = Array.from({ length: 16 }, () => 0);
  Buffer.from(name.slice(0, 16), "utf8").forEach((byte, index) => {
    out[index] = byte;
  });
  return out;
}

async function main() {
  const programId = new PublicKey(
    process.env.AXIOM_PROGRAM_ID ?? DEFAULT_PROGRAM_ID
  );
  const delegatedWallet = new PublicKey(process.env.DELEGATED_WALLET ?? "");
  const destination = new PublicKey(process.env.DESTINATION ?? "");
  const maxAmountUsdc = Number(process.env.MAX_AMOUNT_USDT ?? 1.01);
  const { connection, program, provider, wallet } = await loadProgram();
  const [ikaPolicy] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("ika_policy"),
      wallet.publicKey.toBuffer(),
      delegatedWallet.toBuffer(),
    ],
    programId
  );

  const existing = await connection.getAccountInfo(ikaPolicy, "confirmed");
  if (existing) {
    console.log("Borrower policy already exists");
    console.log("Policy:", ikaPolicy.toBase58());
    return;
  }

  const empty = PublicKey.default;
  const signature = await program.methods
    .initializeIkaPolicy(
      { borrower: {} },
      [destination, empty, empty],
      1,
      new anchor.BN(Math.floor(maxAmountUsdc * 1_000_000)),
      false,
      originChain("solana")
    )
    .accounts({
      owner: wallet.publicKey,
      ikaPolicy,
      dwallet: delegatedWallet,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const latestBlockhash = await provider.connection.getLatestBlockhash("confirmed");
  await provider.connection.confirmTransaction(
    { signature, ...latestBlockhash },
    "confirmed"
  );

  console.log("AXIOM borrower delegated policy initialized");
  console.log("Owner:", wallet.publicKey.toBase58());
  console.log("Delegated wallet:", delegatedWallet.toBase58());
  console.log("Destination:", destination.toBase58());
  console.log("Policy:", ikaPolicy.toBase58());
  console.log("Max amount:", maxAmountUsdc);
  console.log("Signature:", signature);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
