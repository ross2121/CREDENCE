import { Connection, PublicKey } from "@solana/web3.js";

const DEFAULT_RPC = "https://api.devnet.solana.com";
const KVAULT_PROGRAM_ID = new PublicKey(
  process.env.KAMINO_KVAULT_PROGRAM_ID ??
    "devkRngFnfp4gBc5a3LsadgbQKdPo8MSZ4prFiNSVmY"
);
const VAULT_STATE_SIZE_WITH_DISCRIMINATOR = 62_552;
const VAULT_STATE_OFFSET = 8;
const VAULT_ALLOCATION_OFFSET = VAULT_STATE_OFFSET + 304;
const VAULT_ALLOCATION_SIZE = 2_160;
const MAX_RESERVES = 25;

function pubkey(data: Buffer, offset: number) {
  return new PublicKey(data.subarray(offset, offset + 32)).toBase58();
}

function u64(data: Buffer, offset: number) {
  return data.readBigUInt64LE(offset).toString();
}

async function main() {
  const connection = new Connection(
    process.env.SOLANA_RPC_URL ?? DEFAULT_RPC,
    "confirmed"
  );
  const accounts = await connection.getProgramAccounts(KVAULT_PROGRAM_ID, {
    filters: [{ dataSize: VAULT_STATE_SIZE_WITH_DISCRIMINATOR }],
  });

  const vaults = accounts
    .map(({ pubkey: vault, account }) => {
      const data = account.data;
      const reserves = [];

      for (let i = 0; i < MAX_RESERVES; i += 1) {
        const offset = VAULT_ALLOCATION_OFFSET + i * VAULT_ALLOCATION_SIZE;
        const reserve = pubkey(data, offset);
        if (reserve === PublicKey.default.toBase58()) continue;

        reserves.push({
          reserve,
          ctokenVault: pubkey(data, offset + 32),
          targetWeight: u64(data, offset + 64),
          tokenAllocationCap: u64(data, offset + 72),
          ctokenAllocation: u64(data, offset + 1104),
        });
      }

      return {
        vault: vault.toBase58(),
        tokenMint: pubkey(data, VAULT_STATE_OFFSET + 72),
        tokenMintDecimals: u64(data, VAULT_STATE_OFFSET + 104),
        tokenVault: pubkey(data, VAULT_STATE_OFFSET + 112),
        tokenProgram: pubkey(data, VAULT_STATE_OFFSET + 144),
        baseVaultAuthority: pubkey(data, VAULT_STATE_OFFSET + 32),
        sharesMint: pubkey(data, VAULT_STATE_OFFSET + 176),
        sharesMintDecimals: u64(data, VAULT_STATE_OFFSET + 208),
        tokenAvailable: u64(data, VAULT_STATE_OFFSET + 216),
        sharesIssued: u64(data, VAULT_STATE_OFFSET + 224),
        reserves,
      };
    })
    .sort((a, b) => b.reserves.length - a.reserves.length);

  console.log(JSON.stringify(vaults, null, 2));
  console.log("\nUse one vault by setting:");
  console.log("KAMINO_VAULT=<vault>");
  console.log("POOL_ASSET_MINT=<tokenMint>");
  console.log("USDT_MINT=<tokenMint> # legacy env name used by current scripts");
  console.log("USDT_VAULT=<AXIOM token account for tokenMint>");
  console.log("LENDER_USDT_ACCOUNT=<your token account for tokenMint>");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
