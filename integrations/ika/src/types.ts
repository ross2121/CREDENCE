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

export type IkaNetwork = "localnet" | "testnet" | "mainnet";

export type IkaSdkClientConfig = {
  network?: IkaNetwork;
  suiRpcUrl?: string;
  cache?: boolean;
};

export type IkaSdkClientHandle = {
  sdk: Record<string, unknown>;
  sui: Record<string, unknown>;
  suiClient: unknown;
  ikaClient: unknown;
  network: IkaNetwork;
};

export type IkaCurveName = "SECP256K1" | "SECP256R1" | "ED25519" | "RISTRETTO";

export type IkaUserShareKeyMaterial = {
  curve: IkaCurveName;
  suiAddress: string;
  publicKey: Uint8Array;
  serialized: Uint8Array;
};

export type IkaSigningDefaults = {
  curve: IkaCurveName;
  signatureAlgorithm: "ECDSASecp256k1" | "Taproot" | "ECDSASecp256r1" | "EdDSA";
  hash: "KECCAK256" | "SHA256" | "DoubleSHA256" | "SHA512";
  chain: "solana" | "bitcoin" | "ethereum" | "webauthn";
};
