import { PublicKey } from "@solana/web3.js";
import { AxiomClient } from "../../../sdk/src";
import {
  DwalletPolicyConfig,
  PolicyAction,
  PolicyEnforcedResult,
} from "./types";

export class IkaDwalletClient {
  constructor(readonly axiom: AxiomClient) {}

  borrowerPolicy(args: {
    owner: PublicKey;
    dwallet: PublicKey;
    repaymentDestination: PublicKey;
    maxTransactionAmount: number;
  }): DwalletPolicyConfig {
    return {
      owner: args.owner,
      dwallet: args.dwallet,
      kind: "borrower",
      allowedDestinations: [args.repaymentDestination],
      maxTransactionAmount: args.maxTransactionAmount,
      originChain: "solana",
    };
  }

  lenderPolicy(args: {
    owner: PublicKey;
    dwallet: PublicKey;
    kaminoVault: PublicKey;
    poolVault: PublicKey;
    maxTransactionAmount: number;
  }): DwalletPolicyConfig {
    return {
      owner: args.owner,
      dwallet: args.dwallet,
      kind: "lender",
      allowedDestinations: [args.kaminoVault, args.poolVault],
      maxTransactionAmount: args.maxTransactionAmount,
      originChain: "solana",
    };
  }

  crossChainCollateralPolicy(args: {
    owner: PublicKey;
    dwallet: PublicKey;
    collateralVault: PublicKey;
    originChain: string;
    maxTransactionAmount: number;
  }): DwalletPolicyConfig {
    return {
      owner: args.owner,
      dwallet: args.dwallet,
      kind: "crossChainCollateral",
      allowedDestinations: [args.collateralVault],
      maxTransactionAmount: args.maxTransactionAmount,
      crossChain: true,
      originChain: args.originChain,
    };
  }

  initializePolicy(config: DwalletPolicyConfig) {
    return this.axiom.initializeIkaPolicy({
      kind: config.kind,
      allowedDestinations: config.allowedDestinations,
      maxTransactionAmount: config.maxTransactionAmount,
      crossChain: config.crossChain,
      originChain: config.originChain,
    });
  }

  enforce<T>(
    action: PolicyAction,
    buildAction: () => T
  ): PolicyEnforcedResult<T> {
    return {
      policyCheck: this.axiom.verifyIkaPolicy(
        action.dwallet,
        action.destination,
        action.amount
      ),
      action: buildAction(),
    };
  }

  validateOffchain(config: DwalletPolicyConfig, action: PolicyAction): void {
    if (!config.dwallet.equals(action.dwallet)) {
      throw new Error("Action dWallet does not match policy");
    }
    if (action.amount <= 0) {
      throw new Error("Action amount must be positive");
    }
    if (action.amount > config.maxTransactionAmount) {
      throw new Error("Action exceeds Ika policy max transaction amount");
    }
    if (
      !config.allowedDestinations.some((destination) =>
        destination.equals(action.destination)
      )
    ) {
      throw new Error("Action destination is not allowed by Ika policy");
    }
  }
}
