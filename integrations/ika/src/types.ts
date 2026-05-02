import { PublicKey } from "@solana/web3.js";
import { IkaPolicyKindName } from "../../../sdk/src";

export type DwalletPolicyConfig = {
  owner: PublicKey;
  dwallet: PublicKey;
  kind: IkaPolicyKindName;
  allowedDestinations: PublicKey[];
  maxTransactionAmount: number;
  crossChain?: boolean;
  originChain?: string;
};

export type PolicyAction = {
  dwallet: PublicKey;
  destination: PublicKey;
  amount: number;
  description: string;
};

export type PolicyEnforcedResult<T> = {
  policyCheck: unknown;
  action: T;
};
