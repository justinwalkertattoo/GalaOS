/**
 * Rate Limiter
 *
 * Implements sliding window rate limiting with Redis
 * Protects APIs from abuse and DDoS attacks
 */

import Redis from 'ioredis';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (identifier: string) => string;
  handler?: (identifier: string) => Promise<void>;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

export interface RateLimitResult {
  allowed: boolean;
  info: RateLimitInfo;
}

export class RateLimiter {
  private redis: Redis;
  private config: Required<RateLimitConfig>;

  constructor(redis?: Redis, config?: Partial<RateLimitConfig>) {
    this.redis = redis || new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    this.config = {
      windowMs: config?.windowMs || 60 * 1000, // 1 minute
      max: config?.max || 100, // 100 requests per minute
      skipSuccessfulRequests: config?.skipSuccessfulRequests || false,
      skipFailedRequests: config?.skipFailedRequests || false,
      keyGenerator: config?.keyGenerator || ((id) => `rate_limit:${id}`),
      handler: config?.handler || this.defaultHandler,
    };
  }

  /**
   * Check if request is allowed and increment counter
   */
  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const key = this.config.keyGenerator(identifier);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Use Redis sorted set to track requests in sliding window
    const pipeline = this.redis.pipeline();

    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Count requests in current window
    pipeline.zcard(key);

    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiry on key
    pipeline.expire(key, Math.ceil(this.config.windowMs / 1000));

    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Redis pipeline failed');
    }

    // Get count before adding current request
    const count = (results[1][1] as number) || 0;

    const allowed = count < this.config.max;
    const remaining = Math.max(0, this.config.max - count - 1);
    const resetTime = new Date(now + this.config.windowMs);

    const info: RateLimitInfo = {
      limit: this.config.max,
      current: count + 1,
      remaining,
      resetTime,
    };

    if (!allowed) {
      await this.config.handler(identifier);
    }

    return { allowed, info };
  }

  /**
   * Consume a request (increment counter)
   */
  async consume(identifier: string, tokens: number = 1): Promise<RateLimitResult> {
    return await this.checkLimit(identifier);
  }

  /**
   * Reset rate limit for an identifier
   */
  async reset(identifier: string): Promise<void> {
    const key = this.config.keyGenerator(identifier);
    await this.redis.del(key);
  }

  /**
   * Get current rate limit info without consuming
   */
  async getInfo(identifier: string): Promise<RateLimitInfo> {
    const key = this.config.keyGenerator(identifier);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Count requests in current window
    await this.redis.zremrangebyscore(key, 0, windowStart);
    const count = await this.redis.zcard(key);

    return {
      limit: this.config.max,
      current: count,
      remaining: Math.max(0, this.config.max - count),
      resetTime: new Date(now + this.config.windowMs),
    };
  }

  /**
   * Default handler when rate limit is exceeded
   */
  private async defaultHandler(identifier: string): Promise<void> {
    console.warn(`Rate limit exceeded for ${identifier}`);
  }

  /**
   * Create a rate limiter for specific use case
   */
  static forAPI(max: number = 100, windowMs: number = 60 * 1000): RateLimiter {
    return new RateLimiter(undefined, { max, windowMs });
  }

  static forAuth(max: number = 5, windowMs: number = 15 * 60 * 1000): RateLimiter {
    return new RateLimiter(undefined, { max, windowMs });
  }

  static forAI(max: number = 20, windowMs: number = 60 * 1000): RateLimiter {
    return new RateLimiter(undefined, { max, windowMs });
  }
}

/**
 * DDoS Protection - Stricter rate limiting for suspicious behavior
 */
export class DDoSProtection {
  private strictLimiter: RateLimiter;
  private suspiciousIPs: Map<string, number>;
  private blockedIPs: Set<string>;

  constructor(redis?: Redis) {
    // Very strict rate limit
    this.strictLimiter = new RateLimiter(redis, {
      max: 10,
      windowMs: 1000, // 10 requests per second max
    });

    this.suspiciousIPs = new Map();
    this.blockedIPs = new Set();
  }

  /**
   * Check if request should be blocked
   */
  async checkRequest(ip: string, endpoint: string): Promise<{ allowed: boolean; reason?: string }> {
    // Check if IP is blocked
    if (this.blockedIPs.has(ip)) {
      return { allowed: false, reason: 'IP blocked due to suspicious activity' };
    }

    // Check rate limit
    const { allowed } = await this.strictLimiter.checkLimit(ip);

    if (!allowed) {
      // Track violations
      const violations = (this.suspiciousIPs.get(ip) || 0) + 1;
      this.suspiciousIPs.set(ip, violations);

      // Block after 3 violations
      if (violations >= 3) {
        this.blockedIPs.add(ip);
        console.error(`🚨 IP ${ip} blocked due to repeated rate limit violations`);
        return { allowed: false, reason: 'IP blocked due to abuse' };
      }

      return { allowed: false, reason: 'Rate limit exceeded' };
    }

    return { allowed: true };
  }

  /**
   * Unblock an IP
   */
  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    this.suspiciousIPs.delete(ip);
  }

  /**
   * Get blocked IPs
   */
  getBlockedIPs(): string[] {
    return Array.from(this.blockedIPs);
  }
}

/**
 * Middleware factory for Express-like frameworks
 */
export function createRateLimitMiddleware(limiter: RateLimiter) {
  return async (req: any, res: any, next: any) => {
    const identifier = req.ip || req.connection.remoteAddress || 'unknown';

    try {
      const { allowed, info } = await limiter.checkLimit(identifier);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', info.limit.toString());
      res.setHeader('X-RateLimit-Remaining', info.remaining.toString());
      res.setHeader('X-RateLimit-Reset', info.resetTime.toISOString());

      if (!allowed) {
        res.setHeader('Retry-After', Math.ceil((info.resetTime.getTime() - Date.now()) / 1000));
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: info.resetTime,
        });
      }

      next();
    } catch (error: any) {
      console.error('Rate limit middleware error:', error);
      // Fail open - allow request if rate limiter fails
      next();
    }
  };
}

export default RateLimiter;
