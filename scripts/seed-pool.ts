import { PublicKey } from "@solana/web3.js";

const programId = new PublicKey(
  process.env.AXIOM_PROGRAM_ID ?? "6Xrd8Ymz9vxecWjifKern6LAzXQ2XKcS4D1zsJ8ENLpK"
);
const usdtMint = new PublicKey(
  process.env.USDT_MINT ??
    (() => {
      throw new Error("USDT_MINT is required");
    })()
);
const usdtVault = new PublicKey(
  process.env.USDT_VAULT ??
    (() => {
      throw new Error("USDT_VAULT is required");
    })()
);

async function main() {
  const initialLiquidity = Number(process.env.INITIAL_POOL_USDT ?? 100_000);
  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("lending_pool"), usdtVault.toBuffer()],
    programId
  );

  console.log("AXIOM pool seed plan");
  console.log("Program:", programId.toBase58());
  console.log("USDT mint:", usdtMint.toBase58());
  console.log("USDT vault:", usdtVault.toBase58());
  console.log("Lending pool PDA:", poolPda.toBase58());
  console.log("Initial liquidity USDT:", initialLiquidity.toLocaleString());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
