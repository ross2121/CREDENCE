"use client";

import {
  Activity,
  CircleDollarSign,
  DatabaseZap,
  PieChart,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Metric } from "@/components/metric";
import { StatusState } from "@/components/status-state";
import { useLivePool } from "@/hooks/use-live-pool";

export default function AnalyticsPage() {
  const livePool = useLivePool();
  const live = livePool.data;
  const poolStatus = livePool.loading
    ? "loading"
    : livePool.error
      ? "error"
      : "success";
  const utilization = live ? Math.round(live.utilizationBps / 100) : 0;

  return (
    <div className="space-y-6">
      <section>
        <Badge>Analytics</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          Protocol health
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Live pool analytics read directly from AXIOM devnet accounts. Off-chain
          distribution, rewards, and historical charts stay hidden until their
          indexers are connected.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric
          label="Total deposits"
          value={`$${(live?.totalDepositsUsdc ?? 0).toLocaleString()}`}
          detail={live ? "Devnet pool" : "Not loaded"}
        />
        <Metric
          label="Total borrowed"
          value={`$${(live?.totalBorrowedUsdc ?? 0).toLocaleString()}`}
          detail={live ? "Devnet pool" : "Not loaded"}
        />
        <Metric
          label="Utilization"
          value={`${utilization}%`}
          detail={live ? "Devnet pool" : "Not loaded"}
        />
        <Metric
          label="Kamino allocation"
          value={`$${(live?.kaminoAllocatedUsdc ?? 0).toLocaleString()}`}
          detail={live ? "Configured vault" : "Not loaded"}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <StatusState
          message={
            livePool.error ??
            "Pool totals, utilization, USDC vault, and Kamino share account are loaded from devnet."
          }
          state={poolStatus}
          title="Devnet analytics"
        />
        <StatusState
          message="Historical borrower cohorts and rewards require a deployed indexer. No synthetic chart data is shown."
          state="empty"
          title="Off-chain indexers"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Live allocation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <ProgressRow label="Borrowed" value={utilization} />
            <ProgressRow
              label="Kamino allocation"
              value={live ? Math.round(live.kaminoAllocationBps / 100) : 0}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <InfoPanel
                icon={<CircleDollarSign className="h-5 w-5" />}
                label="Liquid vault"
                value={`$${(live?.liquidVaultUsdc ?? 0).toLocaleString()}`}
              />
              <InfoPanel
                icon={<Activity className="h-5 w-5" />}
                label="Base interest"
                value={`${((live?.baseInterestBps ?? 0) / 100).toFixed(2)}%`}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DatabaseZap className="h-4 w-4" />
              Connected data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoPanel
              icon={<ShieldCheck className="h-5 w-5" />}
              label="Pool account"
              value={live?.lendingPool ?? "Not loaded"}
            />
            <InfoPanel
              icon={<CircleDollarSign className="h-5 w-5" />}
              label="USDC vault"
              value={live?.usdcVault ?? "Not loaded"}
            />
            <InfoPanel
              icon={<Activity className="h-5 w-5" />}
              label="Last rebalance"
              value={live?.lastRebalance ?? "Not rebalanced"}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-sm bg-muted">
        <div
          className="h-2 rounded-sm bg-primary"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
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
