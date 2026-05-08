"use client";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Coins,
  Gift,
  LineChart,
  LockKeyhole,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Metric } from "@/components/metric";
import { StatusState } from "@/components/status-state";
import { useLivePool } from "@/hooks/use-live-pool";
import { demoApi } from "@/lib/demo-api";
import { useAxiomStore } from "@/store/use-axiom-store";

const apyRows = [
  { label: "Borrower interest", key: "borrower" },
  { label: "Kamino idle yield", key: "kamino" },
  { label: "Blended lender APY", key: "blended" },
];

export default function LendPage() {
  const {
    pool,
    lenderPosition,
    lenderAction,
    yieldAllocation,
    updateLenderAction,
  } = useAxiomStore((state) => ({
    pool: state.pool,
    lenderPosition: state.lenderPosition,
    lenderAction: state.lenderAction,
    yieldAllocation: state.yieldAllocation,
    updateLenderAction: state.updateLenderAction,
  }));
  const livePool = useLivePool();
  const live = livePool.data;
  const displayPool = useMemo(
    () => ({
      totalDeposits: live?.totalDepositsUsdc ?? pool.totalDepositsUsdt,
      totalBorrowed: live?.totalBorrowedUsdc ?? pool.totalBorrowedUsdt,
      liquidVault: live?.liquidVaultUsdc ?? yieldAllocation.axiomPoolUsdt,
      kamino: live?.kaminoAllocatedUsdc ?? yieldAllocation.kaminoUsdt,
      utilizationBps:
        live?.utilizationBps ??
        Math.round((pool.totalBorrowedUsdt / pool.totalDepositsUsdt) * 10_000),
      baseInterestBps:
        live?.baseInterestBps ?? yieldAllocation.borrowerInterestApyBps,
      kaminoAllocationBps:
        live?.kaminoAllocationBps ??
        Math.round(
          (yieldAllocation.kaminoUsdt / pool.totalDepositsUsdt) * 10_000
        ),
      lastRebalance: live?.lastRebalance ?? yieldAllocation.lastRebalance,
    }),
    [live, pool, yieldAllocation]
  );
  const utilization = Math.round(displayPool.utilizationBps / 100);
  const kaminoShare = Math.round(displayPool.kaminoAllocationBps / 100);
  const statusState = livePool.loading
    ? "loading"
    : livePool.error
    ? "error"
    : "success";

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <Badge>Lender</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">
            USDC lending dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Supply devnet USDC, track borrower demand, and let the local yield
            agent route idle liquidity through Kamino under Privy and AXIOM
            policy limits.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Position</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <InfoPanel
              icon={<Wallet className="h-5 w-5" />}
              label="Wallet USDC"
              value={`$${lenderPosition.walletUsdt.toLocaleString()}`}
            />
            <InfoPanel
              icon={<Coins className="h-5 w-5" />}
              label="Supplied"
              value={`$${lenderPosition.suppliedUsdt.toLocaleString()}`}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric
          label="Deposits"
          value={`$${displayPool.totalDeposits.toLocaleString()}`}
        />
        <Metric
          label="Borrowed"
          value={`$${displayPool.totalBorrowed.toLocaleString()}`}
        />
        <Metric label="Utilization" value={`${utilization}%`} />
        <Metric
          label="Base rate"
          value={`${(displayPool.baseInterestBps / 100).toFixed(2)}%`}
          detail={live ? "Read from devnet pool" : "Demo fallback"}
        />
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <StatusState
          message={
            livePool.error ??
            "Connected to AXIOM devnet pool, USDC vault, and Kamino shares account."
          }
          state={statusState}
          title="Devnet pool"
        />
        <StatusState
          message={demoApi.borrower.message}
          state={demoApi.borrower.state}
          title="Privy policy"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Deposit and withdraw</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="space-y-2">
              <span className="text-sm font-medium">Amount</span>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                min={100}
                onChange={(event) =>
                  updateLenderAction({ amountUsdt: Number(event.target.value) })
                }
                type="number"
                value={lenderAction.amountUsdt}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Button>
                <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
                Deposit
              </Button>
              <Button variant="outline">
                <ArrowUpFromLine className="h-4 w-4" aria-hidden="true" />
                Withdraw
              </Button>
            </div>
            <div className="flex gap-3 rounded-md border border-border bg-muted p-3">
              <LockKeyhole className="mt-1 h-4 w-4 text-primary" />
              <p className="text-sm text-muted-foreground">
                Privy policy and AXIOM on-chain checks permit deposits to the
                AXIOM vault and rebalances to the configured Kamino vault only.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current allocation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <InfoPanel
                icon={<Coins className="h-5 w-5" />}
                label="AXIOM pool liquidity"
                value={`$${displayPool.liquidVault.toLocaleString()}`}
              />
              <InfoPanel
                icon={<RefreshCw className="h-5 w-5" />}
                label="Kamino allocation"
                value={`$${displayPool.kamino.toLocaleString()}`}
              />
            </div>
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Kamino share</span>
                <span>{kaminoShare}%</span>
              </div>
              <div className="h-2 rounded-sm bg-muted">
                <div
                  className="h-2 rounded-sm bg-primary"
                  style={{ width: `${kaminoShare}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Last rebalance: {displayPool.lastRebalance}
              </p>
            </div>
            {live ? (
              <div className="grid gap-2 rounded-md border border-border p-3 text-xs text-muted-foreground">
                <AddressRow label="Pool" value={live.lendingPool} />
                <AddressRow label="USDC vault" value={live.usdcVault} />
                <AddressRow
                  label="Kamino shares"
                  value={live.kaminoSharesAccount}
                />
                <AddressRow label="Kamino vault" value={live.kaminoVault} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>APY breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {apyRows.map((row) => {
              const value =
                row.key === "borrower"
                  ? displayPool.baseInterestBps
                  : row.key === "kamino"
                  ? yieldAllocation.kaminoApyBps
                  : yieldAllocation.blendedApyBps;

              return (
                <div key={row.key}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{row.label}</span>
                    <span>{value / 100}%</span>
                  </div>
                  <div className="h-2 rounded-sm bg-muted">
                    <div
                      className="h-2 rounded-sm bg-primary"
                      style={{ width: `${Math.min(value / 14, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Torque rewards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoPanel
              icon={<Gift className="h-5 w-5" />}
              label="Claimable TORQ"
              value={lenderPosition.pendingTorque.toLocaleString()}
            />
            <div className="rounded-md border border-border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-primary" />
                Lender boost active
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Current utilization keeps supply incentives available for new
                USDC deposits above $100.
              </p>
            </div>
            <Button className="w-full" variant="secondary">
              <Gift className="h-4 w-4" aria-hidden="true" />
              Claim rewards
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            Earnings ticker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            {["09:00", "12:00", "15:00", "18:00"].map((time, index) => (
              <div key={time} className="rounded-md border border-border p-4">
                <p className="text-sm text-muted-foreground">{time}</p>
                <p className="mt-1 text-lg font-semibold">
                  +${(1.86 + index * 0.21).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AddressRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[110px_1fr]">
      <span>{label}</span>
      <span className="truncate font-mono">{value}</span>
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
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
