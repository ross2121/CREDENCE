"use client";

import { LogIn, LogOut } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useConnectedStandardWallets } from "@privy-io/react-auth/solana";
import { Button } from "@/components/ui/button";

function shortAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function PrivyAuthButton() {
  const { authenticated, login, logout, ready, user } = usePrivy();
  const { wallets: connectedWallets } = useConnectedStandardWallets();

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

  const activeSolanaAccount = user?.linkedAccounts
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
    )[0] as { address: string } | undefined;
  const activeSolanaAddress = activeSolanaAccount?.address ?? null;
  const address = connectedWallets.find(
    (wallet) => wallet.address === activeSolanaAddress
  )?.address;
  const label = address ? `Switch ${shortAddress(address)}` : "Switch wallet";

  return (
    <Button
      onClick={async () => {
        await Promise.all(
          connectedWallets.map((wallet) =>
            wallet.disconnect().catch(() => null)
          )
        );
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
