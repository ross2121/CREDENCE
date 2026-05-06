import { PublicKey } from "@solana/web3.js";
import { AgentPolicyKindName } from "../../../sdk/src";

export type PrivyPolicyConfig = {
  owner: PublicKey;
  agentWallet: PublicKey;
  kind: AgentPolicyKindName;
  allowedDestinations: PublicKey[];
  maxTransactionAmount: number;
  privyPolicyId?: string;
  privySignerId?: string;
  crossChain?: boolean;
  originChain?: string;
};

export type PrivyPolicyAction = {
  agentWallet: PublicKey;
  destination: PublicKey;
  amount: number;
  description: string;
};

export type PrivyPolicyEnforcedResult<T> = {
  policyCheck: unknown;
  action: T;
  privyPolicyId?: string;
  privySignerId?: string;
};
