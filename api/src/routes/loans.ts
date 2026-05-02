import { FastifyInstance } from "fastify";
import { z } from "zod";
import { QueueBundle } from "../jobs/queues.js";

const scoreRequest = z.object({
  wallet: z.string().min(32),
});

export async function loanRoutes(
  app: FastifyInstance,
  deps: { queues: QueueBundle }
) {
  app.post("/credit/score", async (request, reply) => {
    const body = scoreRequest.parse(request.body);

    if (deps.queues.creditScoring) {
      const job = await deps.queues.creditScoring.add("score-wallet", body);
      return reply.code(202).send({ queued: true, jobId: job.id });
    }

    return {
      queued: false,
      wallet: body.wallet,
      tier: "Gold",
      maxLoanUsdt: 12_500,
      proofStatus: "ready",
    };
  });

  app.get("/loans/:wallet", async (request) => {
    const params = z.object({ wallet: z.string() }).parse(request.params);

    return {
      wallet: params.wallet,
      loans: [
        {
          loanPubkey: "loan-demo-001",
          principalUsdt: 7_500,
          repaidUsdt: 2_180,
          status: "Streaming",
        },
      ],
    };
  });
}
