import { FastifyInstance } from "fastify";
import type { Redis } from "ioredis";
import { z } from "zod";
import { cachedJson } from "../services/cache.js";

const analyticsQuery = z.object({
  window: z.enum(["24h", "7d", "30d"]).default("7d"),
});

export async function analyticsRoutes(
  app: FastifyInstance,
  deps: { redis?: Redis }
) {
  app.get("/analytics/summary", async (request) => {
    const query = analyticsQuery.parse(request.query);

    return cachedJson(
      deps.redis,
      `analytics:${query.window}`,
      async () => ({
        window: query.window,
        totalDepositsUsdt: 128_000,
        totalBorrowedUsdt: 84_500,
        utilizationBps: 6_602,
        poolApyBps: 970,
        repaymentSuccessBps: 9_680,
      }),
      30
    );
  });
}
