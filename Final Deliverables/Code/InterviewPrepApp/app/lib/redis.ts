import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

/**
 * Cache-aside helper.
 * Reads from Redis first; on a cache miss, runs `fn`, stores the result, and
 * returns it. If Redis is unavailable (env vars missing or connection error),
 * falls through to `fn` without crashing the request.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    const cached = await getRedis().get<T>(key);
    if (cached !== null) return cached;
    const fresh = await fn();
    await getRedis().setex(key, ttlSeconds, fresh);
    return fresh;
  } catch {
    // Redis unavailable — fall through to the data source
    return fn();
  }
}
