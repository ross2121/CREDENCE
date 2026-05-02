import { PublicKey } from "@solana/web3.js";

const programId = new PublicKey(
  process.env.AXIOM_PROGRAM_ID ?? "HWZyoS2jthQHXuV9EDYfUz9iZBS6dbmWQyPKw1HB4dLb"
);
const usdtMint = new PublicKey(
  process.env.USDT_MINT ?? "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
);

async function main() {
  const initialLiquidity = Number(process.env.INITIAL_POOL_USDT ?? 100_000);
  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("lending_pool"), usdtMint.toBuffer()],
    programId
  );

  console.log("AXIOM pool seed plan");
  console.log("Program:", programId.toBase58());
  console.log("USDT mint:", usdtMint.toBase58());
  console.log("Lending pool PDA:", poolPda.toBase58());
  console.log("Initial liquidity USDT:", initialLiquidity.toLocaleString());
  console.log("Demo mode: transaction submission is intentionally not automatic.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
