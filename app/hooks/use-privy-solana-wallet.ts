"use client";

import { useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  useSendTransaction,
  useSolanaWallets,
} from "@privy-io/react-auth/solana";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";

export type AxiomWallet = {
  connected: boolean;
  publicKey: PublicKey | null;
  ready: boolean;
  connect: () => void;
  createWallet: () => Promise<void>;
  sendTransaction: (
    transaction: Transaction,
    connection: Connection
  ) => Promise<string>;
};

export function usePrivySolanaWallet(): AxiomWallet {
  const { authenticated, login, ready: privyReady } = usePrivy();
  const {
    createWallet: createPrivyWallet,
    ready: walletsReady,
    wallets,
  } = useSolanaWallets();
  const { sendTransaction } = useSendTransaction();
  const address = wallets[0]?.address ?? null;

  return useMemo(
    () => ({
      connected: authenticated && Boolean(address),
      publicKey: address ? new PublicKey(address) : null,
      ready: privyReady && walletsReady,
      connect: () =>
        login({
          walletChainType: "solana-only",
        }),
      createWallet: async () => {
        await createPrivyWallet();
      },
      sendTransaction: async (
        transaction: Transaction,
        connection: Connection
      ) => {
        if (!address) throw new Error("Connect Privy wallet first");

        const receipt = await sendTransaction({
          transaction,
          connection,
          address,
        });
        return receipt.signature;
      },
    }),
    [
      address,
      authenticated,
      createPrivyWallet,
      login,
      privyReady,
      sendTransaction,
      walletsReady,
    ]
  );
}
