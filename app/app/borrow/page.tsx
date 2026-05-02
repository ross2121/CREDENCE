"use client";

import { ArrowRight, CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Metric } from "@/components/metric";
import { useAxiomStore } from "@/store/use-axiom-store";

export default function BorrowPage() {
  const credit = useAxiomStore((state) => state.credit);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="space-y-6">
        <div>
          <Badge>Borrower</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">
            Private USDT credit
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Connect a wallet, verify dWallet policy, generate a local credit
            proof, and request USDT without exposing raw wallet history.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Credit tier" value={credit.tier} detail="ZK proof ready" />
          <Metric
            label="Max loan"
            value={`$${credit.maxLoanUsdt.toLocaleString()}`}
            detail="USDT principal limit"
          />
          <Metric
            label="Collateral"
            value={`${credit.collateralRequiredBps / 100}%`}
            detail="Required for this tier"
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Loan request</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-medium">Principal</span>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue="7500"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Duration</span>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option>30 days</option>
                <option>60 days</option>
                <option>90 days</option>
              </select>
            </label>
            <div className="flex items-end">
              <Button className="w-full">
                Request loan
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
      <aside className="space-y-4">
        {[
          ["Wallet connected", "Solana wallet identifies the borrower."],
          ["dWallet policy ready", "Ika blocks unauthorized repayments."],
          ["Credit proof ready", "QVAC output can be registered on-chain."],
        ].map(([title, body], index) => (
          <Card key={title}>
            <CardContent className="flex gap-3 p-5">
              {index === 1 ? (
                <KeyRound className="mt-1 h-5 w-5 text-primary" />
              ) : index === 2 ? (
                <ShieldCheck className="mt-1 h-5 w-5 text-primary" />
              ) : (
                <CheckCircle2 className="mt-1 h-5 w-5 text-primary" />
              )}
              <div>
                <p className="font-medium">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </aside>
    </div>
  );
}
