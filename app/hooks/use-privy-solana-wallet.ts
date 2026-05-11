"use client";

import { useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  useConnectedStandardWallets,
  useSolanaWallets,
  useStandardSignAndSendTransaction,
} from "@privy-io/react-auth/solana";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import bs58 from "bs58";

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
  const { ready: standardWalletsReady, wallets: standardWallets } =
    useConnectedStandardWallets();
  const {
    createWallet: createPrivyWallet,
    ready: walletsReady,
  } = useSolanaWallets();
  const { signAndSendTransaction } = useStandardSignAndSendTransaction();
  const standardWallet = standardWallets[0] ?? null;
  const address = standardWallet?.address ?? null;

  return useMemo(
    () => ({
      connected: authenticated && Boolean(address),
      publicKey: address ? new PublicKey(address) : null,
      ready: privyReady && walletsReady && standardWalletsReady,
      connect: () =>
        login({
          loginMethods: ["wallet"],
          walletChainType: "solana-only",
        }),
      createWallet: async () => {
        await createPrivyWallet();
      },
      sendTransaction: async (
        transaction: Transaction,
        connection: Connection
      ) => {
        void connection;

        if (!address || !standardWallet) {
          throw new Error("Connect Privy wallet first");
        }

        const result = await signAndSendTransaction({
          transaction: transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          }),
          wallet: standardWallet,
          chain: "solana:devnet",
        });
        return bs58.encode(result.signature);
      },
    }),
    [
      address,
      authenticated,
      createPrivyWallet,
      login,
      privyReady,
      signAndSendTransaction,
      standardWallet,
      standardWalletsReady,
      walletsReady,
    ]
  );
}
