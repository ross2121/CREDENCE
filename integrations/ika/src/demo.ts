import { PublicKey } from "@solana/web3.js";
import { IkaDwalletClient } from "./client";

export function unauthorizedDestinationDemo(client: IkaDwalletClient) {
  const owner = PublicKey.unique();
  const dwallet = PublicKey.unique();
  const allowedDestination = PublicKey.unique();
  const blockedDestination = PublicKey.unique();
  const policy = client.borrowerPolicy({
    owner,
    dwallet,
    repaymentDestination: allowedDestination,
    maxTransactionAmount: 1_000,
  });

  client.validateOffchain(policy, {
    dwallet,
    destination: blockedDestination,
    amount: 100,
    description: "attempt repayment to unapproved destination",
  });
}
