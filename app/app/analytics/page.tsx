"use client";

import {
  Activity,
  BadgeDollarSign,
  CircleDollarSign,
  Gift,
  PieChart,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Metric } from "@/components/metric";
import { StatusState } from "@/components/status-state";
import { demoApi } from "@/lib/demo-api";
import { useAxiomStore } from "@/store/use-axiom-store";

export default function AnalyticsPage() {
  const { pool, analytics, lenderPosition } = useAxiomStore((state) => ({
    pool: state.pool,
    analytics: state.analytics,
    lenderPosition: state.lenderPosition,
  }));
  const utilization = Math.round(
    (pool.totalBorrowedUsdt / pool.totalDepositsUsdt) * 100
  );
  const totalTorque = analytics.torqueRewards.reduce(
    (sum, point) => sum + point.value,
    0
  );

  return (
    <div className="space-y-6">
      <section>
        <Badge>Analytics</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          Protocol health
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Monitor pool utilization, credit distribution, repayment quality, and
          Torque campaign rewards from the same operating surface.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric
          label="Total deposits"
          value={`$${pool.totalDepositsUsdt.toLocaleString()}`}
        />
        <Metric
          label="Total borrowed"
          value={`$${pool.totalBorrowedUsdt.toLocaleString()}`}
        />
        <Metric label="Utilization" value={`${utilization}%`} />
        <Metric
          label="Repayment success"
          value={`${analytics.repaymentSuccess.at(-1)?.value ?? 0}%`}
        />
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <StatusState
          message={demoApi.analytics.message}
          state={demoApi.analytics.state}
          title="Analytics fixtures"
        />
        <StatusState
          message={demoApi.borrower.message}
          state={demoApi.borrower.state}
          title="QuickNode listener"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Pool utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-end gap-3">
              {analytics.utilizationHistory.map((point) => (
                <div
                  key={point.label}
                  className="flex h-full flex-1 flex-col justify-end gap-2"
                >
                  <div
                    className="rounded-sm bg-primary"
                    style={{ height: `${point.value}%` }}
                  />
                  <div className="text-center text-xs text-muted-foreground">
                    {point.label}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeDollarSign className="h-4 w-4" />
              Capital totals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoPanel
              icon={<CircleDollarSign className="h-5 w-5" />}
              label="Idle in Kamino"
              value={`$${pool.kaminoAllocationUsdt.toLocaleString()}`}
            />
            <InfoPanel
              icon={<Activity className="h-5 w-5" />}
              label="Active loans"
              value={analytics.activeLoans.toLocaleString()}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Credit tier distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.creditTiers.map((point) => (
              <ProgressRow
                key={point.label}
                label={point.label}
                value={point.value}
                suffix="%"
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Repayment success
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.repaymentSuccess.map((point) => (
              <ProgressRow
                key={point.label}
                label={point.label}
                value={point.value}
                suffix="%"
              />
            ))}
            <p className="pt-2 text-sm text-muted-foreground">
              {analytics.liquidationsAvoided} liquidation warnings resolved by
              borrower agents.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Torque rewards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.torqueRewards.map((point) => (
              <ProgressRow
                key={point.label}
                label={point.label}
                max={totalTorque}
                value={point.value}
              />
            ))}
            <div className="rounded-md border border-border p-4">
              <p className="text-sm text-muted-foreground">Claimable now</p>
              <p className="mt-1 text-xl font-semibold">
                {lenderPosition.pendingTorque.toLocaleString()} TORQ
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  max = 100,
  suffix = "",
}: {
  label: string;
  value: number;
  max?: number;
  suffix?: string;
}) {
  const width = Math.min((value / max) * 100, 100);

  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span>
          {value.toLocaleString()}
          {suffix}
        </span>
      </div>
      <div className="h-2 rounded-sm bg-muted">
        <div className="h-2 rounded-sm bg-primary" style={{ width: `${width}%` }} />
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
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
