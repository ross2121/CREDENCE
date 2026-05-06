"use client";

import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  KeyRound,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Metric } from "@/components/metric";
import { StatusState } from "@/components/status-state";
import { demoApi } from "@/lib/demo-api";
import { useAxiomStore } from "@/store/use-axiom-store";

const scoringSteps = [
  ["GoldRush history", "Cross-chain USDT and DeFi activity fetched."],
  ["QVAC scoring", "Credit model ran locally on borrower device."],
  ["ZK proof", "Tier threshold proof is ready for registration."],
];

export default function BorrowPage() {
  const { connected, publicKey } = useWallet();
  const {
    credit,
    loanRequest,
    activeLoan,
    repaymentStream,
    updateLoanRequest,
  } = useAxiomStore((state) => ({
    credit: state.credit,
    loanRequest: state.loanRequest,
    activeLoan: state.activeLoan,
    repaymentStream: state.repaymentStream,
    updateLoanRequest: state.updateLoanRequest,
  }));
  const repaymentProgress = Math.round(
    (activeLoan.repaidUsdt / activeLoan.principalUsdt) * 100
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div>
            <Badge>Borrower</Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal">
              Private USDT credit
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Connect a wallet, bind repayments to Privy and AXIOM policy, prove
              a private credit tier, and request USDT from the lending pool.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Metric
              label="Credit tier"
              value={credit.tier}
              detail={`${credit.score} local score`}
            />
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
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Wallet and policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-border p-4">
              <Wallet className="mt-1 h-5 w-5 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {connected ? "Wallet connected" : "Connect wallet"}
                </p>
                <p className="mt-1 break-all text-sm text-muted-foreground">
                  {publicKey?.toBase58() ??
                    "Solana wallet required for loan requests."}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-md border border-border p-4">
              <KeyRound className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Privy policy prepared</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Repayments are limited to the AXIOM stream vault and capped at
                  the requested loan amount.
                </p>
              </div>
            </div>
            <WalletMultiButton />
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <StatusState
          message={demoApi.borrower.message}
          state={demoApi.borrower.state}
          title="Borrower fixture"
        />
        <StatusState
          message={demoApi.liquidation.message}
          state={demoApi.liquidation.state}
          title="Liquidation monitor"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Credit scoring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {scoringSteps.map(([title, body]) => (
              <div key={title} className="flex gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tier proof</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Model" value={credit.modelHash} />
            <InfoRow label="Wallet hash" value={credit.walletHash} />
            <InfoRow label="Proof status" value={credit.proofStatus} />
            <InfoRow label="Expires" value={credit.expiresAt} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loan request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="space-y-2">
              <span className="text-sm font-medium">Principal</span>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                max={credit.maxLoanUsdt}
                min={500}
                onChange={(event) =>
                  updateLoanRequest({
                    principalUsdt: Number(event.target.value),
                  })
                }
                type="number"
                value={loanRequest.principalUsdt}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Duration</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) =>
                  updateLoanRequest({
                    durationDays: Number(event.target.value),
                  })
                }
                value={loanRequest.durationDays}
              >
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </label>
            <div className="rounded-md border border-border bg-muted p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <SlidersHorizontal className="h-4 w-4" />
                Terms
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <InfoRow
                  label="Collateral"
                  value={`$${loanRequest.collateralUsdt.toLocaleString()}`}
                />
                <InfoRow label="APY" value={`${activeLoan.apyBps / 100}%`} />
              </div>
            </div>
            <Button className="w-full">
              Request loan
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Active loan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <InfoPanel
                icon={<CircleDollarSign className="h-5 w-5" />}
                label="Principal"
                value={`$${activeLoan.principalUsdt.toLocaleString()}`}
              />
              <InfoPanel
                icon={<Clock3 className="h-5 w-5" />}
                label="Due"
                value={activeLoan.dueDate}
              />
            </div>
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Repaid</span>
                <span>{repaymentProgress}%</span>
              </div>
              <div className="h-2 rounded-sm bg-muted">
                <div
                  className="h-2 rounded-sm bg-primary"
                  style={{ width: `${repaymentProgress}%` }}
                />
              </div>
            </div>
            <Badge>{activeLoan.status}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Repayment stream health</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <InfoPanel
              icon={<ShieldCheck className="h-5 w-5" />}
              label="Health"
              value={`${repaymentStream.healthBps / 100}%`}
            />
            <InfoPanel
              icon={<Activity className="h-5 w-5" />}
              label="Accrued"
              value={`$${repaymentStream.accruedUsdt.toLocaleString()}`}
            />
            <InfoPanel
              icon={<CircleDollarSign className="h-5 w-5" />}
              label="Next claim"
              value={`$${repaymentStream.nextClaimUsdt.toLocaleString()}`}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
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
