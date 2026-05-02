import { PublicKey } from "@solana/web3.js";

const AXIOM_PROGRAM_ID = new PublicKey(
  "HWZyoS2jthQHXuV9EDYfUz9iZBS6dbmWQyPKw1HB4dLb"
);
const USDT_MINT = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");

async function main() {
  const [poolPda, poolBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("lending_pool"), USDT_MINT.toBuffer()],
    AXIOM_PROGRAM_ID
  );

  console.log("AXIOM localnet seed plan");
  console.log("Program:", AXIOM_PROGRAM_ID.toBase58());
  console.log("USDT mint:", USDT_MINT.toBase58());
  console.log("Lending pool PDA:", poolPda.toBase58());
  console.log("Lending pool bump:", poolBump);
  console.log(
    "Next: create a local USDT mint/vault, then call initializePool."
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
