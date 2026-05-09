"use client";

import { useMemo } from "react";
import { KeyRound, Send, ShieldCheck } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useSendTransaction, useSolanaWallets } from "@privy-io/react-auth/solana";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/toast-provider";
import { useBorrowerPolicy } from "@/hooks/use-borrower-policy";
import {
  buildFundRepaymentStreamWithPolicyTransaction,
  initializeBorrowerPrivyPolicyFromWallet,
} from "@/lib/axiom-actions";

type ActionState = "idle" | "loading" | "success" | "error";

export function PrivyRepaymentPanel({
  connection,
  ownerWallet,
  loanAddress,
  loanBorrower,
  streamVault,
  totalDueUsdc,
  repaymentAmountUsdc,
  onActionState,
  onRefresh,
  wallet,
}: {
  connection: Connection;
  ownerWallet: PublicKey | null;
  loanAddress: string | null;
  loanBorrower: string | null;
  streamVault: string | null;
  totalDueUsdc: number;
  repaymentAmountUsdc: number;
  onActionState: (state: ActionState, message: string) => void;
  onRefresh: () => Promise<void>;
  wallet: WalletContextState;
}) {
  const { authenticated, login, ready } = usePrivy();
  const { wallets, createWallet, ready: walletsReady } = useSolanaWallets();
  const { sendTransaction } = useSendTransaction();
  const { showTransactionToast } = useToast();
  const delegatedWalletAddress = wallets[0]?.address ?? null;
  const delegatedWallet = useMemo(
    () => (delegatedWalletAddress ? new PublicKey(delegatedWalletAddress) : null),
    [delegatedWalletAddress]
  );
  const policy = useBorrowerPolicy(ownerWallet, delegatedWallet);
  const borrowerControlsPolicy =
    !!ownerWallet && !!loanBorrower && ownerWallet.toBase58() === loanBorrower;
  const canPreparePolicy =
    borrowerControlsPolicy &&
    !!delegatedWallet &&
    !!streamVault &&
    !policy.data &&
    !policy.loading;
  const canPrivyRepay =
    !!policy.data &&
    policy.data.active &&
    !!delegatedWallet &&
    !!ownerWallet &&
    !!loanAddress &&
    repaymentAmountUsdc > 0 &&
    repaymentAmountUsdc <= policy.data.maxTransactionUsdc;

  async function preparePolicy() {
    if (!delegatedWallet || !streamVault) return;

    onActionState(
      "loading",
      "Waiting for borrower wallet approval to create the delegated repayment policy."
    );
    try {
      const signature = await initializeBorrowerPrivyPolicyFromWallet({
        delegatedWallet,
        maxAmountUsdc: totalDueUsdc,
        streamVault: new PublicKey(streamVault),
        connection,
        wallet,
      });
      await Promise.all([policy.refresh(), onRefresh()]);
      onActionState(
        "success",
        `Confirmed ${signature.slice(0, 8)}...${signature.slice(-8)}`
      );
      showTransactionToast(signature);
    } catch (caught) {
      onActionState(
        "error",
        caught instanceof Error ? caught.message : "Policy initialization failed"
      );
    }
  }

  async function repayWithPrivy() {
    if (!delegatedWallet || !ownerWallet || !loanAddress) return;

    onActionState(
      "loading",
      "Waiting for Privy wallet approval to fund the delegated repayment transaction."
    );
    try {
      const transaction = await buildFundRepaymentStreamWithPolicyTransaction({
        owner: ownerWallet,
        delegatedWallet,
        loan: new PublicKey(loanAddress),
        amountUsdc: repaymentAmountUsdc,
        connection,
      });
      const receipt = await sendTransaction({
        transaction,
        connection,
        address: delegatedWallet.toBase58(),
        uiOptions: {
          description: "Fund AXIOM repayment stream",
          buttonText: "Approve repay",
          transactionInfo: {
            title: "Delegated repayment",
            action: `Fund ${repaymentAmountUsdc.toLocaleString()} USDC`,
          },
        },
      });
      await Promise.all([policy.refresh(), onRefresh()]);
      onActionState(
        "success",
        `Confirmed ${receipt.signature.slice(0, 8)}...${receipt.signature.slice(-8)}`
      );
      showTransactionToast(receipt.signature);
    } catch (caught) {
      onActionState(
        "error",
        caught instanceof Error ? caught.message : "Privy repayment failed"
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privy delegated repay</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border p-4">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-1 h-4 w-4 text-primary" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">
                {authenticated ? "Privy authenticated" : "Privy login required"}
              </p>
              <p className="break-all text-muted-foreground">
                {delegatedWalletAddress ?? "No embedded Solana wallet yet"}
              </p>
            </div>
          </div>
        </div>

        {!ready ? (
          <p className="text-sm text-muted-foreground">Loading Privy session.</p>
        ) : !authenticated ? (
          <Button className="w-full" onClick={login} variant="outline">
            Connect Privy
          </Button>
        ) : !walletsReady ? (
          <p className="text-sm text-muted-foreground">
            Loading embedded wallet state.
          </p>
        ) : !delegatedWalletAddress ? (
          <Button className="w-full" onClick={() => void createWallet()} variant="outline">
            Create embedded wallet
          </Button>
        ) : (
          <>
            <div className="rounded-md border border-border bg-muted p-3 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <PolicyRow
                  label="Policy"
                  value={
                    policy.loading
                      ? "Loading"
                      : policy.data?.active
                      ? "Active"
                      : "Not initialized"
                  }
                />
                <PolicyRow
                  label="Max delegated repay"
                  value={`$${(policy.data?.maxTransactionUsdc ?? totalDueUsdc).toLocaleString()}`}
                />
                <PolicyRow
                  label="Destination"
                  value={policy.data?.allowedDestinations[0] ?? streamVault ?? "N/A"}
                />
                <PolicyRow
                  label="Origin"
                  value={policy.data?.originChain ?? "solana"}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Button
                className="w-full"
                disabled={!canPreparePolicy}
                onClick={() => void preparePolicy()}
                variant="outline"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Prepare policy
              </Button>
              <Button
                className="w-full"
                disabled={!canPrivyRepay}
                onClick={() => void repayWithPrivy()}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Repay with Privy
              </Button>
            </div>

            {!borrowerControlsPolicy ? (
              <p className="text-sm text-muted-foreground">
                The connected borrower wallet must match the live loan borrower
                before it can authorize a delegated Privy repayment policy.
              </p>
            ) : null}
            {policy.data && repaymentAmountUsdc > policy.data.maxTransactionUsdc ? (
              <p className="text-sm text-destructive">
                Repayment amount is above the delegated policy cap.
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              The delegated wallet needs devnet USDC before it can fund the stream.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PolicyRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
}
