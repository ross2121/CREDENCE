"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallet } from "@solana/wallet-adapter-react";

function addressMatches(account: unknown, address: string) {
  if (!account || typeof account !== "object") return false;
  if (!("address" in account) || typeof account.address !== "string") {
    return false;
  }

  return account.address.toLowerCase() === address.toLowerCase();
}

export function PrivyWalletSync() {
  const { publicKey, connected } = useWallet();
  const { authenticated, linkWallet, login, ready, user } = usePrivy();
  const promptedRef = useRef<string | null>(null);

  const address = publicKey?.toBase58();
  const isLinked = useMemo(() => {
    if (!address || !user) return false;

    return (
      addressMatches(user.wallet, address) ||
      user.linkedAccounts.some((account) => addressMatches(account, address))
    );
  }, [address, user]);

  useEffect(() => {
    if (!ready || !connected || !address) return;

    const action = authenticated && !isLinked ? "link" : "login";
    if (authenticated && isLinked) return;

    const promptKey = `privy:${action}:${address}`;
    if (promptedRef.current === promptKey) return;
    if (window.sessionStorage.getItem(promptKey)) return;

    promptedRef.current = promptKey;
    window.sessionStorage.setItem(promptKey, "1");

    if (!authenticated) {
      login({
        loginMethods: ["wallet"],
        walletChainType: "solana-only",
      });
      return;
    }

    linkWallet({
      suggestedAddress: address,
      walletChainType: "solana-only",
    });
  }, [
    address,
    authenticated,
    connected,
    isLinked,
    linkWallet,
    login,
    ready,
  ]);

  return null;
}
