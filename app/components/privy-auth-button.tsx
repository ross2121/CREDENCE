"use client";

import { LogIn, LogOut } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import {
  useConnectedStandardWallets,
  useSolanaWallets,
} from "@privy-io/react-auth/solana";
import { Button } from "@/components/ui/button";

function shortAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function PrivyAuthButton() {
  const { authenticated, login, logout, ready, user } = usePrivy();
  const { wallets: connectedWallets } = useConnectedStandardWallets();
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
        onClick={() =>
          login({
            loginMethods: ["wallet"],
            walletChainType: "solana-only",
          })
        }
        variant="outline"
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        Privy
      </Button>
    );
  }

  const address =
    connectedWallets[0]?.address ?? wallets[0]?.address ?? user?.wallet?.address;
  const label = address ? `Switch ${shortAddress(address)}` : "Switch wallet";

  return (
    <Button
      onClick={async () => {
        await connectedWallets[0]?.disconnect();
        await logout();
      }}
      title="Log out of Privy before switching wallet accounts"
      variant="outline"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      {label}
    </Button>
  );
}
