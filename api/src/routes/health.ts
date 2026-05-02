import { FastifyInstance } from "fastify";
import { Pool } from "pg";
import type { Redis } from "ioredis";
import { cacheStatus } from "../services/cache.js";
import { databaseStatus } from "../services/database.js";
import { queueStatus, QueueBundle } from "../jobs/queues.js";

export async function healthRoutes(
  app: FastifyInstance,
  deps: {
    db?: Pool;
    redis?: Redis;
    queues: QueueBundle;
  }
) {
  app.get("/health", async () => {
    const [database, cache, queues] = await Promise.all([
      databaseStatus(deps.db),
      cacheStatus(deps.redis),
      queueStatus(deps.queues),
    ]);

    return {
      ok: database.healthy && cache.healthy,
      service: "axiom-api",
      database,
      cache,
      queues,
    };
  });
}
