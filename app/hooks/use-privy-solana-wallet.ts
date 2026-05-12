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

function latestAuthenticatedSolanaAddress(
  user: ReturnType<typeof usePrivy>["user"]
) {
  const solanaAccounts =
    user?.linkedAccounts
      .filter(
        (account) =>
          account.type === "wallet" &&
          "address" in account &&
          "chainType" in account &&
          account.chainType === "solana" &&
          account.walletClientType !== "privy"
      )
      .sort(
        (a, b) =>
          new Date(b.latestVerifiedAt ?? b.firstVerifiedAt ?? 0).getTime() -
          new Date(a.latestVerifiedAt ?? a.firstVerifiedAt ?? 0).getTime()
      ) ?? [];

  return (
    (solanaAccounts[0] as { address: string } | undefined)?.address ?? null
  );
}

export function usePrivySolanaWallet(): AxiomWallet {
  const { authenticated, login, ready: privyReady, user } = usePrivy();
  const { ready: standardWalletsReady, wallets: standardWallets } =
    useConnectedStandardWallets();
  const { createWallet: createPrivyWallet, ready: walletsReady } =
    useSolanaWallets();
  const { signAndSendTransaction } = useStandardSignAndSendTransaction();
  const authenticatedAddress = authenticated
    ? latestAuthenticatedSolanaAddress(user)
    : null;
  const standardWallet =
    standardWallets.find((wallet) => wallet.address === authenticatedAddress) ??
    null;
  const address = standardWallet?.address ?? null;

  return useMemo(
    () => ({
      connected: Boolean(address),
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
      user,
      walletsReady,
    ]
  );
}
