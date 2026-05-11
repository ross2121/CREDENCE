"use client";

import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  KeyRound,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrivyRepaymentPanel } from "@/components/privy-repayment-panel";
import { useToast } from "@/components/toast-provider";
import { Metric } from "@/components/metric";
import { StatusState } from "@/components/status-state";
import { useBorrowerState } from "@/hooks/use-borrower-state";
import { useLivePool } from "@/hooks/use-live-pool";
import { usePrivySolanaWallet } from "@/hooks/use-privy-solana-wallet";
import {
  claimRepaymentsToPoolFromWallet,
  closeRepaymentStreamFromWallet,
  disburseLoanFromWallet,
  executeLiquidationFromWallet,
  fundRepaymentStreamFromWallet,
  issueLiquidationWarningFromWallet,
  initRepaymentStreamFromWallet,
  mintReputationFromWallet,
  registerFixtureCreditProof,
  requestLoanFromWallet,
} from "@/lib/axiom-actions";
import { useAxiomStore } from "@/store/use-axiom-store";

const scoringSteps = [
  ["GoldRush history", "Cross-chain USDT and DeFi activity fetched."],
  ["QVAC scoring", "Credit model ran locally on borrower device."],
  ["ZK proof", "Tier threshold proof is ready for registration."],
];

const tierConfig = {
  Bronze: { collateralBps: 8_000, interestBps: 1_800, maxLoanUsdt: 500 },
  Silver: { collateralBps: 5_000, interestBps: 1_200, maxLoanUsdt: 2_000 },
  Gold: { collateralBps: 2_500, interestBps: 800, maxLoanUsdt: 10_000 },
  Platinum: { collateralBps: 1_000, interestBps: 500, maxLoanUsdt: 50_000 },
} as const;

export default function BorrowPage() {
  const wallet = usePrivySolanaWallet();
  const { connection } = useConnection();
  const { showTransactionToast } = useToast();
  const { connected, publicKey } = wallet;
  const [actionState, setActionState] = useState<{
    status: "idle" | "loading" | "success" | "error";
    message: string;
  }>({
    status: "idle",
    message: "Connect a wallet to register a proof or request a loan.",
  });
  const [repaymentAmountUsdc, setRepaymentAmountUsdc] = useState(1);
  const [adminLoanAddress, setAdminLoanAddress] = useState("");
  const [adminBorrowerAddress, setAdminBorrowerAddress] = useState("");
  const [liquidationCollateralValueUsdc, setLiquidationCollateralValueUsdc] =
    useState(0.05);
  const [liquidationLoanValueUsdc, setLiquidationLoanValueUsdc] =
    useState(0.1);
  const borrowerState = useBorrowerState(publicKey);
  const livePool = useLivePool();
  const {
    credit,
    loanRequest,
    updateLoanRequest,
  } = useAxiomStore(
    useShallow((state) => ({
      credit: state.credit,
      loanRequest: state.loanRequest,
      updateLoanRequest: state.updateLoanRequest,
    }))
  );
  const liveProof = borrowerState.data?.creditProof;
  const liveLoan = borrowerState.data?.loan;
  const liveStream = borrowerState.data?.repaymentStream;
  const liveLiquidation = borrowerState.data?.liquidationState;
  const effectiveTier =
    (liveProof?.tier ?? credit.tier) as keyof typeof tierConfig;
  const effectiveTierConfig = tierConfig[effectiveTier];
  const derivedCollateralUsdt = Math.ceil(
    (loanRequest.principalUsdt * effectiveTierConfig.collateralBps) / 10_000
  );
  const displayedCredit = {
    tier: liveProof?.tier ?? "Unregistered",
    maxLoanUsdt: liveProof?.maxLoanUsdc ?? 0,
    collateralRequiredBps: liveProof ? effectiveTierConfig.collateralBps : 0,
    proofStatus: liveProof ? "registered" : credit.proofStatus,
    score: liveProof ? credit.score : null,
    modelHash: liveProof ? credit.modelHash : "Not registered",
    walletHash: liveProof ? credit.walletHash : "Not registered",
    expiresAt: liveProof?.expiresAt ?? credit.expiresAt,
  };
  const displayedLoan = {
    principalUsdt: liveLoan?.principalUsdc ?? 0,
    repaidUsdt: liveLoan?.repaidUsdc ?? 0,
    apyBps: liveLoan?.interestBps ?? 0,
    dueDate: liveLoan?.dueDate ?? "No active loan",
    status: liveLoan?.status ?? "None",
    disbursed: liveLoan?.disbursed ?? false,
    collateralUsdc: liveLoan?.collateralUsdc ?? 0,
    outstandingPrincipalUsdt:
      liveLoan?.outstandingPrincipalUsdc ??
      0,
  };
  const displayedStream = {
    healthBps: liveStream?.healthBps ?? 0,
    accruedUsdc: liveStream?.accruedUsdc ?? 0,
    claimableUsdc: liveStream?.claimableUsdc ?? 0,
    fundedUsdc: liveStream?.fundedUsdc ?? 0,
    totalDueUsdc:
      liveStream?.totalDueUsdc ??
      0,
    availableVaultUsdc:
      liveStream?.availableVaultUsdc ??
      0,
    streamVault: liveStream?.streamVault ?? "Not initialized",
    endDate: liveStream?.endDate ?? displayedLoan.dueDate,
    canClose: liveStream?.canClose ?? false,
  };
  const proofWarning =
    liveProof && liveProof.maxLoanUsdc < 1
      ? "This wallet has an older devnet proof with a near-zero loan cap. Use a fresh wallet and register a new proof."
      : null;
  const requestedAmountExceedsTierLimit =
    loanRequest.principalUsdt > displayedCredit.maxLoanUsdt;
  const requestLoanDisabled =
    actionState.status === "loading" ||
    !connected ||
    !liveProof ||
    Boolean(liveLoan) ||
    requestedAmountExceedsTierLimit;
  const repaymentProgress =
    displayedLoan.principalUsdt > 0
      ? Math.round(
          (displayedLoan.repaidUsdt / displayedLoan.principalUsdt) * 100
        )
      : 0;
  const borrowerStatus = borrowerState.loading
    ? "loading"
    : borrowerState.error
    ? "error"
    : "success";
  const isPoolAuthority =
    !!livePool.data?.authority && publicKey?.toBase58() === livePool.data.authority;
  const isBorrowerWallet =
    !!liveLoan?.borrower && publicKey?.toBase58() === liveLoan.borrower;
  const canDisburse =
    !!liveLoan &&
    liveLoan.status === "Active" &&
    !liveLoan.disbursed &&
    isPoolAuthority &&
    actionState.status !== "loading";
  const canInitStream =
    !!liveLoan &&
    liveLoan.status === "Active" &&
    liveLoan.disbursed &&
    !liveStream &&
    isBorrowerWallet &&
    actionState.status !== "loading";
  const canFundStream =
    !!liveStream &&
    isBorrowerWallet &&
    repaymentAmountUsdc > 0 &&
    actionState.status !== "loading";
  const canClaimStream =
    !!liveStream &&
    isPoolAuthority &&
    displayedStream.claimableUsdc > 0 &&
    actionState.status !== "loading";
  const canCloseStream =
    !!liveStream &&
    displayedStream.canClose &&
    isBorrowerWallet &&
    actionState.status !== "loading";
  const effectiveAdminLoan = adminLoanAddress || liveLoan?.address || "";
  const effectiveAdminBorrower =
    adminBorrowerAddress || liveLoan?.borrower || publicKey?.toBase58() || "";
  const canMintReputation = connected && actionState.status !== "loading";
  const canIssueLiquidation =
    isPoolAuthority &&
    Boolean(effectiveAdminLoan) &&
    liquidationCollateralValueUsdc > 0 &&
    liquidationLoanValueUsdc > 0 &&
    actionState.status !== "loading";
  const canExecuteLiquidation =
    isPoolAuthority &&
    Boolean(effectiveAdminLoan) &&
    Boolean(effectiveAdminBorrower) &&
    actionState.status !== "loading";

  async function runAction(
    action:
      | "proof"
      | "loan"
      | "mintReputation"
      | "disburse"
      | "initStream"
      | "fundStream"
      | "claimStream"
      | "closeStream"
      | "issueLiquidation"
      | "executeLiquidation"
  ) {
    setActionState({
      status: "loading",
      message: {
        proof: "Waiting for wallet approval to register the devnet credit proof.",
        loan: "Waiting for wallet approval to create the loan request.",
        mintReputation: "Waiting for wallet approval to create reputation state.",
        disburse: "Waiting for pool-authority approval to disburse the loan.",
        initStream: "Waiting for borrower approval to initialize the stream vault.",
        fundStream: "Waiting for borrower approval to fund the repayment stream.",
        claimStream: "Waiting for pool-authority approval to claim repayments.",
        closeStream: "Waiting for borrower approval to close the repaid stream.",
        issueLiquidation:
          "Waiting for pool-authority approval to issue liquidation warning.",
        executeLiquidation:
          "Waiting for pool-authority approval to execute liquidation.",
      }[action],
    });

    try {
      let signature: string;
      if (action === "proof") {
        signature = await registerFixtureCreditProof({ connection, wallet });
      } else if (action === "loan") {
        signature = await requestLoanFromWallet({
          amountUsdc: loanRequest.principalUsdt,
          durationDays: loanRequest.durationDays,
          collateralUsdc: derivedCollateralUsdt,
          connection,
          wallet,
        });
      } else if (action === "mintReputation") {
        signature = await mintReputationFromWallet({ connection, wallet });
      } else if (action === "issueLiquidation") {
        signature = await issueLiquidationWarningFromWallet({
          loan: new PublicKey(effectiveAdminLoan),
          collateralValueUsdc: liquidationCollateralValueUsdc,
          loanValueUsdc: liquidationLoanValueUsdc,
          connection,
          wallet,
        });
      } else if (action === "executeLiquidation") {
        signature = await executeLiquidationFromWallet({
          borrower: new PublicKey(effectiveAdminBorrower),
          loan: new PublicKey(effectiveAdminLoan),
          connection,
          wallet,
        });
      } else {
        if (!liveLoan) {
          throw new Error("No live loan found for this wallet");
        }

        const loan = new PublicKey(liveLoan.address);
        const borrower = new PublicKey(liveLoan.borrower);

        if (action === "disburse") {
          signature = await disburseLoanFromWallet({
            borrower,
            loan,
            connection,
            wallet,
          });
        } else if (action === "initStream") {
          signature = await initRepaymentStreamFromWallet({
            loan,
            connection,
            wallet,
          });
        } else if (action === "fundStream") {
          signature = await fundRepaymentStreamFromWallet({
            loan,
            amountUsdc: repaymentAmountUsdc,
            connection,
            wallet,
          });
        } else if (action === "claimStream") {
          signature = await claimRepaymentsToPoolFromWallet({
            loan,
            connection,
            wallet,
          });
        } else {
          signature = await closeRepaymentStreamFromWallet({
            loan,
            connection,
            wallet,
          });
        }
      }

      await Promise.all([borrowerState.refresh(), livePool.refresh()]);
      setActionState({
        status: "success",
        message: `Confirmed ${signature.slice(0, 8)}...${signature.slice(-8)}`,
      });
      showTransactionToast(signature);
    } catch (caught) {
      setActionState({
        status: "error",
        message:
          caught instanceof Error ? caught.message : "Borrower transaction failed",
      });
    }
  }

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
              value={displayedCredit.tier}
              detail={
                displayedCredit.score
                  ? `${displayedCredit.score} local score`
                  : "Register a QVAC-backed proof"
              }
            />
            <Metric
              label="Max loan"
              value={`$${displayedCredit.maxLoanUsdt.toLocaleString()}`}
              detail="USDC principal limit"
            />
            <Metric
              label="Collateral"
              value={`${displayedCredit.collateralRequiredBps / 100}%`}
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
            <Button onClick={wallet.connect} disabled={!wallet.ready}>
              {connected ? "Privy connected" : "Connect Privy"}
            </Button>
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <StatusState
          message={
            borrowerState.error ??
            "Borrower proof and loan PDAs are loaded from AXIOM devnet."
          }
          state={borrowerStatus}
          title="Borrower state"
        />
        <StatusState
          message={actionState.message}
          state={actionState.status === "idle" ? "empty" : actionState.status}
          title="Wallet action"
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
            <InfoRow label="Model" value={displayedCredit.modelHash} />
            <InfoRow label="Wallet hash" value={displayedCredit.walletHash} />
            <InfoRow label="Proof status" value={displayedCredit.proofStatus} />
            <InfoRow label="Expires" value={displayedCredit.expiresAt} />
            {liveProof ? (
              <InfoRow label="Proof PDA" value={liveProof.address} />
            ) : null}
            {proofWarning ? (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                {proofWarning}
              </p>
            ) : null}
            <Button
              className="w-full"
              disabled={
                actionState.status === "loading" || !connected || Boolean(liveProof)
              }
              onClick={() => void runAction("proof")}
              variant="outline"
            >
              Register devnet proof
            </Button>
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
                max={displayedCredit.maxLoanUsdt}
                min={1}
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
                  value={`$${derivedCollateralUsdt.toLocaleString()}`}
                />
                <InfoRow label="APY" value={`${displayedLoan.apyBps / 100}%`} />
              </div>
            </div>
            {requestedAmountExceedsTierLimit ? (
              <p className="text-sm text-destructive">
                Requested amount is above this wallet&apos;s registered tier limit.
              </p>
            ) : null}
            <Button
              className="w-full"
              disabled={requestLoanDisabled}
              onClick={() => void runAction("loan")}
            >
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
                value={`$${displayedLoan.principalUsdt.toLocaleString()}`}
              />
              <InfoPanel
                icon={<Clock3 className="h-5 w-5" />}
                label="Due"
                value={displayedLoan.dueDate}
              />
              <InfoPanel
                icon={<Activity className="h-5 w-5" />}
                label="Outstanding"
                value={`$${displayedLoan.outstandingPrincipalUsdt.toLocaleString()}`}
              />
              <InfoPanel
                icon={<Send className="h-5 w-5" />}
                label="Funding"
                value={displayedLoan.disbursed ? "Disbursed" : "Requested"}
              />
              <InfoPanel
                icon={<ShieldCheck className="h-5 w-5" />}
                label="Collateral"
                value={`$${displayedLoan.collateralUsdc.toLocaleString()}`}
              />
              <InfoPanel
                icon={<Activity className="h-5 w-5" />}
                label="Escrow"
                value={
                  liveLoan?.collateralLiquidated
                    ? "Liquidated"
                    : liveLoan?.collateralReleased
                      ? "Released"
                      : liveLoan?.collateralEscrowed
                        ? "Locked"
                        : "Not locked"
                }
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
            <Badge>{displayedLoan.status}</Badge>
            <Button
              className="w-full"
              disabled={!canDisburse}
              onClick={() => void runAction("disburse")}
              variant="outline"
            >
              Disburse loan
            </Button>
            {!isPoolAuthority && liveLoan && !liveLoan.disbursed ? (
              <p className="text-sm text-muted-foreground">
                Pool authority wallet is required to release principal from the
                AXIOM pool.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Repayment stream health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <InfoPanel
                icon={<ShieldCheck className="h-5 w-5" />}
                label="Health"
                value={`${(displayedStream.healthBps / 100).toFixed(2)}%`}
              />
              <InfoPanel
                icon={<Activity className="h-5 w-5" />}
                label="Accrued"
                value={`$${displayedStream.accruedUsdc.toLocaleString()}`}
              />
              <InfoPanel
                icon={<CircleDollarSign className="h-5 w-5" />}
                label="Claimable"
                value={`$${displayedStream.claimableUsdc.toLocaleString()}`}
              />
              <InfoPanel
                icon={<Send className="h-5 w-5" />}
                label="Funded"
                value={`$${displayedStream.fundedUsdc.toLocaleString()}`}
              />
            </div>
            <div className="rounded-md border border-border bg-muted p-3">
              <div className="grid gap-3 md:grid-cols-2">
                <InfoRow label="Total due" value={`$${displayedStream.totalDueUsdc.toLocaleString()}`} />
                <InfoRow label="Stream ends" value={displayedStream.endDate} />
                <InfoRow label="Vault balance" value={`$${displayedStream.availableVaultUsdc.toLocaleString()}`} />
                <InfoRow label="Stream vault" value={displayedStream.streamVault} />
              </div>
            </div>
            <label className="space-y-2">
              <span className="text-sm font-medium">Repayment amount</span>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                min={0.01}
                onChange={(event) =>
                  setRepaymentAmountUsdc(Number(event.target.value))
                }
                step="0.01"
                type="number"
                value={repaymentAmountUsdc}
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <Button
                disabled={!canInitStream}
                onClick={() => void runAction("initStream")}
                variant="outline"
              >
                Init stream
              </Button>
              <Button
                disabled={!canFundStream}
                onClick={() => void runAction("fundStream")}
              >
                Fund stream
              </Button>
              <Button
                disabled={!canClaimStream}
                onClick={() => void runAction("claimStream")}
                variant="outline"
              >
                Claim to pool
              </Button>
              <Button
                disabled={!canCloseStream}
                onClick={() => void runAction("closeStream")}
                variant="outline"
              >
                Close stream
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Borrower initializes and funds the stream. Pool authority claims
              accrued repayments back into the AXIOM USDC vault.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Collateral terminal state</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <InfoPanel
                icon={<ShieldCheck className="h-5 w-5" />}
                label="Escrow vault"
                value={liveLoan?.collateralVault ?? "No escrow"}
              />
              <InfoPanel
                icon={<Clock3 className="h-5 w-5" />}
                label="Release"
                value={displayedStream.canClose ? "Available" : displayedStream.endDate}
              />
              <InfoPanel
                icon={<Activity className="h-5 w-5" />}
                label="Liquidation"
                value={
                  liveLiquidation
                    ? liveLiquidation.canExecute
                      ? "Executable"
                      : liveLiquidation.graceEndsAt
                    : "No warning"
                }
              />
              <InfoPanel
                icon={<CircleDollarSign className="h-5 w-5" />}
                label="Recovered"
                value={`$${(liveLiquidation?.recoveredUsdc ?? 0).toLocaleString()}`}
              />
            </div>
            <Button
              disabled={!canMintReputation}
              onClick={() => void runAction("mintReputation")}
              variant="outline"
            >
              Create reputation state
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liquidation operations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="space-y-2">
              <span className="text-sm font-medium">Loan address</span>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) => setAdminLoanAddress(event.target.value)}
                placeholder={liveLoan?.address ?? "Loan PDA"}
                value={adminLoanAddress}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Borrower address</span>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) => setAdminBorrowerAddress(event.target.value)}
                placeholder={liveLoan?.borrower ?? "Borrower wallet"}
                value={adminBorrowerAddress}
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium">Collateral value</span>
                <input
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  min={0.01}
                  onChange={(event) =>
                    setLiquidationCollateralValueUsdc(Number(event.target.value))
                  }
                  step="0.01"
                  type="number"
                  value={liquidationCollateralValueUsdc}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Loan value</span>
                <input
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  min={0.01}
                  onChange={(event) =>
                    setLiquidationLoanValueUsdc(Number(event.target.value))
                  }
                  step="0.01"
                  type="number"
                  value={liquidationLoanValueUsdc}
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Button
                disabled={!canIssueLiquidation}
                onClick={() => void runAction("issueLiquidation")}
                variant="outline"
              >
                Issue warning
              </Button>
              <Button
                disabled={!canExecuteLiquidation}
                onClick={() => void runAction("executeLiquidation")}
              >
                Execute liquidation
              </Button>
            </div>
            {!isPoolAuthority ? (
              <p className="text-sm text-muted-foreground">
                Pool authority wallet is required for liquidation operations.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      {process.env.NEXT_PUBLIC_PRIVY_APP_ID ? (
        <section>
          <PrivyRepaymentPanel
            connection={connection}
            loanAddress={liveLoan?.address ?? null}
            loanBorrower={liveLoan?.borrower ?? null}
            onActionState={(status, message) =>
              setActionState({ status, message })
            }
            onRefresh={async () => {
              await Promise.all([borrowerState.refresh(), livePool.refresh()]);
            }}
            ownerWallet={publicKey}
            repaymentAmountUsdc={repaymentAmountUsdc}
            streamVault={liveStream?.streamVault ?? null}
            totalDueUsdc={displayedStream.totalDueUsdc}
            wallet={wallet}
          />
        </section>
      ) : null}
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
      <p className="mt-1 break-words text-base font-semibold">{value}</p>
    </div>
  );
}
