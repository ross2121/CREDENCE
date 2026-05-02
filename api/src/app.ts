import cors from "@fastify/cors";
import Fastify from "fastify";
import { loadConfig } from "./config.js";
import { createQueues } from "./jobs/queues.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { healthRoutes } from "./routes/health.js";
import { loanRoutes } from "./routes/loans.js";
import { createCache } from "./services/cache.js";
import { createDatabase } from "./services/database.js";

export async function buildApp() {
  const config = loadConfig();
  const app = Fastify({
    logger: true,
  });
  const db = createDatabase(config.databaseUrl);
  const redis = createCache(config.redisUrl);
  const queues = createQueues(config.redisUrl);

  await app.register(cors, {
    origin: true,
  });
  await app.register(healthRoutes, { db, redis, queues });
  await app.register(analyticsRoutes, { redis });
  await app.register(loanRoutes, { queues });

  app.addHook("onClose", async () => {
    await db?.end();
    redis?.disconnect();
    await queues.creditScoring?.close();
    await queues.analyticsRefresh?.close();
  });

  return { app, config };
}
