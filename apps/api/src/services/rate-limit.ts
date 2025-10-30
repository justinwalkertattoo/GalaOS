import IORedis from 'ioredis';

let redis: IORedis | null = null;
function getRedis(): IORedis | null {
  try {
    if (redis) return redis;
    const url = process.env.REDIS_URL;
    if (!url) return null;
    redis = new IORedis(url);
    return redis;
  } catch {
    return null;
  }
}

// Fixed-window rate limit with Redis fallback to in-memory token bucket
type Key = string;
const memoryCounters = new Map<Key, { count: number; resetAt: number }>();

export async function rateLimit(key: string, ratePerMinute: number): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const r = getRedis();
  const windowSec = 60;
  const nowSec = Math.floor(Date.now() / 1000);
  const windowKey = `rl:${key}:${Math.floor(nowSec / windowSec)}`;

  if (r) {
    try {
      const pip = r.multi();
      pip.incr(windowKey);
      pip.expire(windowKey, windowSec);
      const res = await pip.exec();
      const current = Number(res?.[0]?.[1] ?? 0);
      if (current <= ratePerMinute) return { allowed: true };
      const ttl = await r.ttl(windowKey);
      return { allowed: false, retryAfterMs: Math.max(0, ttl) * 1000 };
    } catch {
      // fall through to memory
    }
  }

  const now = Date.now();
  const entry = memoryCounters.get(key);
  if (!entry || now >= entry.resetAt) {
    memoryCounters.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { allowed: true };
  }
  if (entry.count < ratePerMinute) {
    entry.count += 1;
    return { allowed: true };
  }
  return { allowed: false, retryAfterMs: Math.max(0, entry.resetAt - now) };
}

export async function rateLimitWindow(key: string, limit: number, windowSec: number): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const r = getRedis();
  const nowSec = Math.floor(Date.now() / 1000);
  const windowKey = `rlw:${key}:${Math.floor(nowSec / windowSec)}:${windowSec}`;
  if (r) {
    try {
      const pip = r.multi();
      pip.incr(windowKey);
      pip.expire(windowKey, windowSec);
      const res = await pip.exec();
      const current = Number(res?.[0]?.[1] ?? 0);
      if (current <= limit) return { allowed: true };
      const ttl = await r.ttl(windowKey);
      return { allowed: false, retryAfterMs: Math.max(0, ttl) * 1000 };
    } catch { /* fallthrough */ }
  }
  // Memory fallback
  const memKey = `${key}:${windowSec}`;
  const entry = memoryCounters.get(memKey);
  const now = Date.now();
  const resetAt = now + windowSec * 1000;
  if (!entry || now >= entry.resetAt) {
    memoryCounters.set(memKey, { count: 1, resetAt });
    return { allowed: true };
  }
  if (entry.count < limit) {
    entry.count += 1;
    return { allowed: true };
  }
  return { allowed: false, retryAfterMs: Math.max(0, entry.resetAt - now) };
}
