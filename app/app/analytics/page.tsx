"use client";

import { Activity, Gift, PieChart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Metric } from "@/components/metric";
import { useAxiomStore } from "@/store/use-axiom-store";

const tiers = [
  ["Bronze", 18],
  ["Silver", 34],
  ["Gold", 41],
  ["Platinum", 7],
];

export default function AnalyticsPage() {
  const pool = useAxiomStore((state) => state.pool);

  return (
    <div className="space-y-6">
      <div>
        <Badge>Analytics</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          Protocol health
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Monitor pool utilization, credit distribution, repayment quality, and
          Torque campaign activity from the same operating surface.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric
          label="Total deposits"
          value={`$${pool.totalDepositsUsdt.toLocaleString()}`}
        />
        <Metric
          label="Total borrowed"
          value={`$${pool.totalBorrowedUsdt.toLocaleString()}`}
        />
        <Metric label="Repayment success" value="96.8%" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Credit tiers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tiers.map(([tier, value]) => (
              <div key={tier}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{tier}</span>
                  <span>{value}%</span>
                </div>
                <div className="h-2 rounded-sm bg-muted">
                  <div
                    className="h-2 rounded-sm bg-primary"
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Repayments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">312</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Streams completed without liquidation in demo history.
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
          <CardContent>
            <p className="text-3xl font-semibold">3</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Active campaign types: lender boost, borrower referral, and
              good-repayer airdrop.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
