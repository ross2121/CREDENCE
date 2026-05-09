"use client";

import { Activity, CircleDollarSign, Clock3, ShieldCheck } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Metric } from "@/components/metric";
import { StatusState } from "@/components/status-state";
import { SolanaWalletButton } from "@/components/solana-wallet-button";
import { useToast } from "@/components/toast-provider";
import { useLivePool } from "@/hooks/use-live-pool";
import {
  executeLiquidationFromWallet,
  issueLiquidationWarningFromWallet,
} from "@/lib/axiom-actions";
import { AXIOM_DEVNET } from "@/lib/devnet-pool";

export default function AdminPage() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const { showTransactionToast } = useToast();
  const livePool = useLivePool();
  const [loanAddress, setLoanAddress] = useState("");
  const [borrowerAddress, setBorrowerAddress] = useState("");
  const [collateralValueUsdc, setCollateralValueUsdc] = useState(0.05);
  const [loanValueUsdc, setLoanValueUsdc] = useState(0.1);
  const [actionState, setActionState] = useState<{
    status: "idle" | "loading" | "success" | "error";
    message: string;
  }>({ status: "idle", message: "Connect the pool authority wallet." });

  const isPoolAuthority =
    !!livePool.data?.authority &&
    wallet.publicKey?.toBase58() === livePool.data.authority;
  const canIssue =
    isPoolAuthority &&
    Boolean(loanAddress) &&
    collateralValueUsdc > 0 &&
    loanValueUsdc > 0 &&
    actionState.status !== "loading";
  const canExecute =
    isPoolAuthority &&
    Boolean(loanAddress) &&
    Boolean(borrowerAddress) &&
    actionState.status !== "loading";

  async function run(action: "issue" | "execute") {
    setActionState({
      status: "loading",
      message:
        action === "issue"
          ? "Waiting for liquidation warning approval."
          : "Waiting for liquidation execution approval.",
    });

    try {
      const signature =
        action === "issue"
          ? await issueLiquidationWarningFromWallet({
              loan: new PublicKey(loanAddress),
              collateralValueUsdc,
              loanValueUsdc,
              connection,
              wallet,
            })
          : await executeLiquidationFromWallet({
              borrower: new PublicKey(borrowerAddress),
              loan: new PublicKey(loanAddress),
              connection,
              wallet,
            });

      await livePool.refresh();
      setActionState({
        status: "success",
        message: `Confirmed ${signature.slice(0, 8)}...${signature.slice(-8)}`,
      });
      showTransactionToast(signature);
    } catch (caught) {
      setActionState({
        status: "error",
        message:
          caught instanceof Error ? caught.message : "Admin transaction failed",
      });
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div>
          <Badge>Operator</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">
            Pool controls
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Execute devnet pool operations that require the AXIOM authority.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Authority wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Metric
              detail={wallet.publicKey?.toBase58() ?? "No wallet connected"}
              label="Connected"
              value={isPoolAuthority ? "Authority" : "Restricted"}
            />
            <SolanaWalletButton />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <StatusState
          message={
            livePool.error ??
            `Pool ${AXIOM_DEVNET.lendingPool.toBase58()} loaded from devnet.`
          }
          state={livePool.loading ? "loading" : livePool.error ? "error" : "success"}
          title="Pool state"
        />
        <StatusState
          message={actionState.message}
          state={actionState.status === "idle" ? "empty" : actionState.status}
          title="Admin action"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Live pool</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <InfoPanel
              icon={<CircleDollarSign className="h-5 w-5" />}
              label="Liquid vault"
              value={`$${(livePool.data?.liquidVaultUsdc ?? 0).toLocaleString()}`}
            />
            <InfoPanel
              icon={<Activity className="h-5 w-5" />}
              label="Borrowed"
              value={`$${(livePool.data?.totalBorrowedUsdc ?? 0).toLocaleString()}`}
            />
            <InfoPanel
              icon={<ShieldCheck className="h-5 w-5" />}
              label="Kamino"
              value={`$${(livePool.data?.kaminoAllocatedUsdc ?? 0).toLocaleString()}`}
            />
            <InfoPanel
              icon={<Clock3 className="h-5 w-5" />}
              label="Last rebalance"
              value={livePool.data?.lastRebalance ?? "Unknown"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liquidation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="space-y-2">
              <span className="text-sm font-medium">Loan address</span>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) => setLoanAddress(event.target.value)}
                placeholder="Loan PDA"
                value={loanAddress}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Borrower address</span>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) => setBorrowerAddress(event.target.value)}
                placeholder="Borrower wallet"
                value={borrowerAddress}
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium">Collateral value</span>
                <input
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  min={0.01}
                  onChange={(event) =>
                    setCollateralValueUsdc(Number(event.target.value))
                  }
                  step="0.01"
                  type="number"
                  value={collateralValueUsdc}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Loan value</span>
                <input
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  min={0.01}
                  onChange={(event) =>
                    setLoanValueUsdc(Number(event.target.value))
                  }
                  step="0.01"
                  type="number"
                  value={loanValueUsdc}
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Button
                disabled={!canIssue}
                onClick={() => void run("issue")}
                variant="outline"
              >
                Issue warning
              </Button>
              <Button disabled={!canExecute} onClick={() => void run("execute")}>
                Execute liquidation
              </Button>
            </div>
            {!isPoolAuthority ? (
              <p className="text-sm text-muted-foreground">
                Connect the pool authority wallet to enable these actions.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function InfoPanel({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="text-primary">{icon}</div>
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-base font-semibold">{value}</p>
    </div>
  );
}
