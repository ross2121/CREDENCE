export type ApiConfig = {
  host: string;
  port: number;
  databaseUrl?: string;
  redisUrl?: string;
  demoMode: boolean;
};

export function loadConfig(): ApiConfig {
  return {
    host: process.env.API_HOST ?? "0.0.0.0",
    port: Number(process.env.API_PORT ?? 8080),
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    demoMode: process.env.AXIOM_DEMO_MODE !== "false",
  };
}
