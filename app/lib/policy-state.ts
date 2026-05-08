"use client";

import { Connection, PublicKey } from "@solana/web3.js";
import { AXIOM_DEVNET } from "@/lib/devnet-pool";

export type LiveBorrowerPolicy = {
  address: string;
  owner: string;
  delegatedWallet: string;
  kind: "Borrower" | "Lender" | "CrossChainCollateral";
  allowedDestinations: string[];
  maxTransactionUsdc: number;
  crossChain: boolean;
  originChain: string;
  active: boolean;
};

function readU64(data: Uint8Array, offset: number) {
  return new DataView(data.buffer, data.byteOffset + offset, 8).getBigUint64(
    0,
    true
  );
}

function readPubkey(data: Uint8Array, offset: number) {
  return new PublicKey(data.slice(offset, offset + 32));
}

function uiUsdc(value: bigint) {
  return Number(value) / 1_000_000;
}

function parseKind(value: number): LiveBorrowerPolicy["kind"] {
  return ["Borrower", "Lender", "CrossChainCollateral"][
    value
  ] as LiveBorrowerPolicy["kind"];
}

function parseOriginChain(bytes: Uint8Array) {
  return new TextDecoder()
    .decode(bytes)
    .replace(/\0+$/g, "")
    .trim();
}

export function deriveIkaPolicy(owner: PublicKey, delegatedWallet: PublicKey) {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from("ika_policy"), owner.toBuffer(), delegatedWallet.toBuffer()],
    AXIOM_DEVNET.programId
  );
  return address;
}

export async function fetchBorrowerPolicyState(
  owner: PublicKey,
  delegatedWallet: PublicKey
): Promise<LiveBorrowerPolicy | null> {
  const connection = new Connection(AXIOM_DEVNET.rpcUrl, "confirmed");
  const address = deriveIkaPolicy(owner, delegatedWallet);
  const account = await connection.getAccountInfo(address, "confirmed");
  if (!account) return null;

  const data = account.data;
  const allowedCount = data[169];
  const allowedDestinations = [73, 105, 137]
    .slice(0, allowedCount)
    .map((offset) => readPubkey(data, offset).toBase58());

  return {
    address: address.toBase58(),
    owner: readPubkey(data, 8).toBase58(),
    delegatedWallet: readPubkey(data, 40).toBase58(),
    kind: parseKind(data[72]),
    allowedDestinations,
    maxTransactionUsdc: uiUsdc(readU64(data, 170)),
    crossChain: Boolean(data[178]),
    originChain: parseOriginChain(data.slice(179, 195)),
    active: Boolean(data[195]),
  };
}
