"use client";

import { ArrowDownToLine, ArrowUpFromLine, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Metric } from "@/components/metric";
import { useAxiomStore } from "@/store/use-axiom-store";

export default function LendPage() {
  const pool = useAxiomStore((state) => state.pool);
  const utilization = Math.round(
    (pool.totalBorrowedUsdt / pool.totalDepositsUsdt) * 100
  );

  return (
    <div className="space-y-6">
      <div>
        <Badge>Lender</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          USDT lending dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Supply USDT, track borrower demand, and route idle liquidity through
          Kamino using policy-bound agent actions.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric
          label="Deposits"
          value={`$${pool.totalDepositsUsdt.toLocaleString()}`}
        />
        <Metric
          label="Borrowed"
          value={`$${pool.totalBorrowedUsdt.toLocaleString()}`}
        />
        <Metric label="Utilization" value={`${utilization}%`} />
        <Metric label="Pool APY" value={`${pool.poolApyBps / 100}%`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Liquidity action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue="2500"
            />
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
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-border p-4">
                <Coins className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">
                  AXIOM pool liquidity
                </p>
                <p className="mt-1 text-xl font-semibold">
                  $
                  {(
                    pool.totalDepositsUsdt - pool.kaminoAllocationUsdt
                  ).toLocaleString()}
                </p>
              </div>
              <div className="rounded-md border border-border p-4">
                <Coins className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Kamino allocation
                </p>
                <p className="mt-1 text-xl font-semibold">
                  ${pool.kaminoAllocationUsdt.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
