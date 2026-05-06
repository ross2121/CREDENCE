import { PublicKey } from "@solana/web3.js";
import { PrivyPolicyClient } from "./client";

export function unauthorizedDestinationDemo(client: PrivyPolicyClient) {
  const owner = PublicKey.unique();
  const agentWallet = PublicKey.unique();
  const allowedDestination = PublicKey.unique();
  const blockedDestination = PublicKey.unique();
  const policy = client.borrowerPolicy({
    owner,
    agentWallet,
    repaymentDestination: allowedDestination,
    maxTransactionAmount: 1_000,
    privyPolicyId: "policy_devnet_borrower",
  });

  client.validateOffchain(policy, {
    agentWallet,
    destination: blockedDestination,
    amount: 100,
    description: "attempt repayment to unapproved destination",
  });
}
