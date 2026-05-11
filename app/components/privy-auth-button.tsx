"use client";

import { LogIn, LogOut } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import { Button } from "@/components/ui/button";

export function PrivyAuthButton() {
  const { authenticated, login, logout, ready, user } = usePrivy();
  const { wallets } = useSolanaWallets();

  if (!ready) {
    return (
      <Button disabled variant="outline">
        <LogIn className="h-4 w-4" aria-hidden="true" />
        Privy
      </Button>
    );
  }

  if (!authenticated) {
    return (
      <Button
        onClick={() => login({ walletChainType: "solana-only" })}
        variant="outline"
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        Privy
      </Button>
    );
  }

  const address = wallets[0]?.address ?? user?.wallet?.address;
  const label = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : "Privy";

  return (
    <Button onClick={logout} variant="outline">
      <LogOut className="h-4 w-4" aria-hidden="true" />
      {label}
    </Button>
  );
}
