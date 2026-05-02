import { createHash } from "crypto";
import { PublicKey } from "@solana/web3.js";
import { AxiomClient } from "../../../sdk/src";
import { buildFeatureVector } from "./feature-engineering";
import { GoldRushFetcher } from "./goldrush-fetcher";
import { CreditModel, LocalCreditModel } from "./model";
import { CreditDecision, GeneratedCreditProof, WalletHistory } from "./types";
import { ZkProofGenerator } from "./zk-proof-generator";

export class CreditAgent {
  constructor(
    readonly fetcher = new GoldRushFetcher({
      apiKey: process.env.GOLDRUSH_API_KEY,
    }),
    readonly model: CreditModel = new LocalCreditModel(),
    readonly proofGenerator = new ZkProofGenerator()
  ) {}

  async scoreWallet(wallet: string, history?: WalletHistory) {
    const walletHistory =
      history ?? (await this.fetcher.fetchWalletHistory(wallet));
    const features = buildFeatureVector(walletHistory);
    const decision = await this.model.decide(features);
    const proof = this.proofGenerator.generate({
      wallet,
      decision,
      walletHash: hashField(wallet),
      modelHash: hashField("AXIOM_CREDIT_MODEL_V1"),
    });

    return { features, decision, proof };
  }

  buildProofRegistration(
    client: AxiomClient,
    decision: CreditDecision,
    proof: GeneratedCreditProof
  ) {
    return client.registerCreditProof({
      tier: decision.tier,
      maxLoan: decision.maxLoanUsdt * 1_000_000,
      proof: proof.proof,
      expiry: proof.expiresAt,
    });
  }

  buildLoanRequest(
    client: AxiomClient,
    decision: CreditDecision,
    args: {
      amountUsdt: number;
      durationDays: number;
      ikaDwallet: PublicKey;
    }
  ) {
    const amount = args.amountUsdt * 1_000_000;
    const collateralAmount = Math.ceil(
      (amount * decision.collateralBps) / 10_000
    );

    return client.requestLoan({
      amount,
      durationDays: args.durationDays,
      collateralAmount,
      ikaDwallet: args.ikaDwallet,
    });
  }
}

export function hashField(value: string): string {
  const digest = createHash("sha256").update(value).digest("hex");
  return (BigInt(`0x${digest}`) / BigInt(256)).toString();
}
