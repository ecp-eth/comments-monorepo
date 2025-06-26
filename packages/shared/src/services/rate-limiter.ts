import { type Duration, Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { Hex } from "viem";

interface RateLimiterOptions {
  redisUrl?: string;
  redisToken?: string;
  namespace?: string;
  /**
   * The number of tokens allowed per window
   *
   * @default 60
   */
  tokensPerWindow?: number;
  /**
   * The duration of the window
   *
   * @default "1 m"
   */
  window?: Duration;
}

export class RateLimiter {
  private readonly limiter?: Ratelimit;
  private readonly redis?: Redis;

  constructor({
    redisToken,
    redisUrl,
    namespace,
    tokensPerWindow = 60,
    window = "1 m",
  }: RateLimiterOptions = {}) {
    if (!redisUrl || !redisToken) {
      console.warn("Redis credentials not provided, rate limiting disabled");
      return;
    }

    this.redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    this.limiter = new Ratelimit({
      redis: this.redis,
      limiter: Ratelimit.slidingWindow(tokensPerWindow, window),
      prefix: namespace,
    });
  }

  /**
   * Check if the ethereum address is rate limited
   * @param ethereumAddress The ethereum address to check
   * @returns Object containing success status and reset timestamp
   */
  async isRateLimited(ethereumAddress: Hex): Promise<{
    success: boolean;
    reset: number;
    remaining: number;
  }> {
    if (!this.limiter) {
      // When no Redis connection, always allow requests
      return {
        success: true,
        reset: 0,
        remaining: 1,
      };
    }

    const { success, reset, remaining } = await this.limiter.limit(
      ethereumAddress.toLowerCase(),
    );

    return {
      success,
      reset,
      remaining,
    };
  }
}
