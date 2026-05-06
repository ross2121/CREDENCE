import { PublicKey } from "@solana/web3.js";
import { AxiomClient } from "../../../sdk/src";
import {
  PrivyPolicyAction,
  PrivyPolicyConfig,
  PrivyPolicyEnforcedResult,
} from "./types";

export class PrivyPolicyClient {
  constructor(readonly axiom: AxiomClient) {}

  borrowerPolicy(args: {
    owner: PublicKey;
    agentWallet: PublicKey;
    repaymentDestination: PublicKey;
    maxTransactionAmount: number;
    privyPolicyId?: string;
    privySignerId?: string;
  }): PrivyPolicyConfig {
    return {
      owner: args.owner,
      agentWallet: args.agentWallet,
      kind: "borrower",
      allowedDestinations: [args.repaymentDestination],
      maxTransactionAmount: args.maxTransactionAmount,
      privyPolicyId: args.privyPolicyId,
      privySignerId: args.privySignerId,
      originChain: "solana",
    };
  }

  lenderPolicy(args: {
    owner: PublicKey;
    agentWallet: PublicKey;
    kaminoVault: PublicKey;
    poolVault: PublicKey;
    maxTransactionAmount: number;
    privyPolicyId?: string;
    privySignerId?: string;
  }): PrivyPolicyConfig {
    return {
      owner: args.owner,
      agentWallet: args.agentWallet,
      kind: "lender",
      allowedDestinations: [args.kaminoVault, args.poolVault],
      maxTransactionAmount: args.maxTransactionAmount,
      privyPolicyId: args.privyPolicyId,
      privySignerId: args.privySignerId,
      originChain: "solana",
    };
  }

  initializePolicy(config: PrivyPolicyConfig) {
    return this.axiom.initializeAgentPolicy({
      kind: config.kind,
      allowedDestinations: config.allowedDestinations,
      maxTransactionAmount: config.maxTransactionAmount,
      crossChain: config.crossChain,
      originChain: config.originChain,
    });
  }

  enforce<T>(
    action: PrivyPolicyAction,
    buildAction: () => T,
    config?: Pick<PrivyPolicyConfig, "privyPolicyId" | "privySignerId">
  ): PrivyPolicyEnforcedResult<T> {
    return {
      policyCheck: this.axiom.verifyAgentPolicy(
        action.agentWallet,
        action.destination,
        action.amount
      ),
      action: buildAction(),
      privyPolicyId: config?.privyPolicyId,
      privySignerId: config?.privySignerId,
    };
  }

  validateOffchain(config: PrivyPolicyConfig, action: PrivyPolicyAction): void {
    if (!config.agentWallet.equals(action.agentWallet)) {
      throw new Error("Action agent wallet does not match Privy policy");
    }
    if (action.amount <= 0) {
      throw new Error("Action amount must be positive");
    }
    if (action.amount > config.maxTransactionAmount) {
      throw new Error("Action exceeds Privy policy max transaction amount");
    }
    if (
      !config.allowedDestinations.some((destination) =>
        destination.equals(action.destination)
      )
    ) {
      throw new Error("Action destination is not allowed by Privy policy");
    }
  }
}
