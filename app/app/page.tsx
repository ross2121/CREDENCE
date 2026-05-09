import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    title: "Private credit score",
    body: "QVAC runs the borrower risk model locally, so raw wallet history does not need to be uploaded to Credence.",
    icon: Bot,
  },
  {
    title: "Proof-gated borrowing",
    body: "The app registers a credit-tier proof on Solana and maps the tier to loan limits, collateral, and APR.",
    icon: ShieldCheck,
  },
  {
    title: "Controlled repayment",
    body: "Repayments go into a stream vault. Privy can automate repayment actions, while on-chain rules bound what can be signed.",
    icon: LockKeyhole,
  },
];

const trustItems = [
  "Borrowers reveal a tier, not their full financial profile.",
  "Loan, collateral, stream, and pool state live on Solana devnet.",
  "Lenders can see pool liquidity, utilization, and repayment recovery.",
  "If a borrower fails to repay, collateral can move through warning and liquidation.",
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="grid min-h-[calc(100vh-11rem)] items-center gap-8 py-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Badge>Private AI credit on Solana</Badge>
          <div className="max-w-3xl space-y-4">
            <h1 className="text-4xl font-semibold tracking-normal text-foreground md:text-6xl">
              Credence turns private credit signals into enforceable on-chain
              loans.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Borrowers get USDC credit without exposing raw financial history.
              Lenders fund a transparent pool, repayments stream back on-chain,
              and policy automation keeps wallet actions bounded.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              href="/borrow"
            >
              Try borrowing
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              href="/lend"
            >
              View lending pool
            </Link>
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-4 shadow-sm">
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-md bg-secondary p-4">
              <div>
                <p className="text-sm text-muted-foreground">Borrower signal</p>
                <p className="mt-1 text-2xl font-semibold">Private tier proof</p>
              </div>
              <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Signal label="Credit model" value="QVAC local" />
              <Signal label="Borrowing" value="Proof gated" />
              <Signal label="Collateral" value="Escrowed" />
              <Signal label="Repayment" value="Streamed" />
            </div>
            <div className="rounded-md border border-border p-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-medium">Repayment stream</span>
                <span className="text-primary">Active</span>
              </div>
              <div className="h-2 rounded-sm bg-muted">
                <div className="h-2 w-[92%] rounded-sm bg-primary" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Borrower funds the stream, then the pool claims accrued
                repayments over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Card key={step.title}>
              <CardHeader>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <CardTitle>{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">
                  {step.body}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 rounded-md border border-border bg-card p-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <Badge>Trust model</Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-normal">
            What the system proves
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Credence does not ask lenders to trust a hidden database. The
            borrower tier, loan state, collateral escrow, and repayment stream
            are visible on Solana devnet.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {trustItems.map((item) => (
            <div
              className="flex gap-3 rounded-md border border-border p-4 text-sm leading-6"
              key={item}
            >
              <ShieldCheck
                className="mt-0.5 h-4 w-4 flex-none text-primary"
                aria-hidden="true"
              />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <PathCard
          href="/borrow"
          icon={<Wallet className="h-5 w-5" aria-hidden="true" />}
          title="Borrower"
          body="Register a private tier proof, request credit, lock collateral, and fund the repayment stream."
        />
        <PathCard
          href="/lend"
          icon={<Landmark className="h-5 w-5" aria-hidden="true" />}
          title="Lender"
          body="Deposit USDC, track utilization, withdraw liquid funds, and route idle capital toward Kamino."
        />
        <PathCard
          href="/analytics"
          icon={<Sparkles className="h-5 w-5" aria-hidden="true" />}
          title="Analytics"
          body="Monitor pool health, credit distribution, repayment progress, and protocol-level activity."
        />
      </section>
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function PathCard({
  body,
  href,
  icon,
  title,
}: {
  body: string;
  href: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Link
      className="rounded-md border border-border bg-card p-5 text-card-foreground transition-colors hover:border-primary"
      href={href}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
        Open
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </Link>
  );
}
