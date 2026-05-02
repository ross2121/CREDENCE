import { Redis } from "ioredis";

export type CacheStatus = {
  configured: boolean;
  healthy: boolean;
};

export function createCache(redisUrl?: string) {
  if (!redisUrl) return undefined;

  return new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });
}

export async function cacheStatus(redis?: Redis): Promise<CacheStatus> {
  if (!redis) return { configured: false, healthy: true };

  try {
    if (redis.status === "wait") await redis.connect();
    await redis.ping();
    return { configured: true, healthy: true };
  } catch {
    return { configured: true, healthy: false };
  }
}

export async function cachedJson<T>(
  redis: Redis | undefined,
  key: string,
  fallback: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  if (!redis) return fallback();

  const existing = await redis.get(key);
  if (existing) return JSON.parse(existing) as T;

  const value = await fallback();
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  return value;
}
