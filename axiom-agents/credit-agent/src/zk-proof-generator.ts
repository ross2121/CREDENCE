import { createHash } from "crypto";
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

    return {
      proof: Array.from(digest),
      publicSignals: [
        String(request.decision.score),
        request.walletHash,
        request.modelHash,
      ],
      expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    };
  }
}
