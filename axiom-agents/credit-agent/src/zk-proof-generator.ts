import { createHash } from "crypto";
import { fieldToBytes32 } from "../../../sdk/src";
import { TIER_CONFIG } from "./model";
import { GeneratedCreditProof, ProofRequest } from "./types";

export class ZkProofGenerator {
  generate(request: ProofRequest): GeneratedCreditProof {
    const digest = createHash("sha256")
      .update(
        JSON.stringify({
          wallet: request.wallet,
          tier: request.decision.tier,
          score: request.decision.score,
          walletHash: request.walletHash,
          modelHash: request.modelHash,
        })
      )
      .digest();
    const tierThreshold = TIER_CONFIG[request.decision.tier].minScore;

    return {
      proof: Array.from(digest),
      publicSignals: [
        String(tierThreshold),
        request.walletHash,
        request.modelHash,
      ],
      publicInputs: [
        fieldToBytes32(tierThreshold),
        fieldToBytes32(request.walletHash),
        fieldToBytes32(request.modelHash),
      ],
      expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    };
  }
}
