"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Landmark, ShieldCheck, Wallet } from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAxiomStore } from "@/store/use-axiom-store";
import { demoSeed } from "@/lib/demo-api";

const nav = [
  { href: "/borrow", label: "Borrow", icon: ShieldCheck },
  { href: "/lend", label: "Lend", icon: Landmark },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { demoMode, toggleDemoMode } = useAxiomStore();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Wallet className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-semibold leading-tight">AXIOM</p>
              <p className="text-xs text-muted-foreground">
                Sovereign AI credit and yield
              </p>
            </div>
            {demoMode ? <Badge>Demo</Badge> : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <nav className="flex rounded-md border border-border bg-background p-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-sm px-3 text-sm font-medium text-muted-foreground transition-colors",
                      active && "bg-secondary text-secondary-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <Button variant="outline" onClick={toggleDemoMode}>
              {demoMode ? "Live mode" : "Demo mode"}
            </Button>
            <WalletMultiButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">{children}</main>
      {demoMode ? (
        <footer className="mx-auto max-w-7xl px-4 pb-6 text-xs text-muted-foreground lg:px-6">
          Deterministic demo seed: {demoSeed}
        </footer>
      ) : null}
    </div>
  );
}
