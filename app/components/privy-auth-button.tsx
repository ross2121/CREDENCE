"use client";

import { LogIn, LogOut } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";

export function PrivyAuthButton() {
  const { authenticated, login, logout, ready, user } = usePrivy();

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
      <Button onClick={login} variant="outline">
        <LogIn className="h-4 w-4" aria-hidden="true" />
        Privy
      </Button>
    );
  }

  const label = user?.wallet?.address
    ? `${user.wallet.address.slice(0, 4)}...${user.wallet.address.slice(-4)}`
    : "Privy";

  return (
    <Button onClick={logout} variant="outline">
      <LogOut className="h-4 w-4" aria-hidden="true" />
      {label}
    </Button>
  );
}
