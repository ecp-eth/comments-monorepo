import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "../env";
import type { Hex } from "viem";

interface RateLimiterOptions {
  redisUrl?: string;
  redisToken?: string;
  namespace?: string;
}

export class RateLimiter {
  private readonly limiter?: Ratelimit;
  private readonly redis?: Redis;

  constructor({ redisToken, redisUrl, namespace }: RateLimiterOptions = {}) {
    if (!redisUrl || !redisToken) {
      console.warn("Redis credentials not provided, rate limiting disabled");
      return;
    }

    this.redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    // Create a new ratelimiter that allows 1 request per minute
    this.limiter = new Ratelimit({
      redis: this.redis,
      limiter: Ratelimit.slidingWindow(1, "1 m"),
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
      ethereumAddress.toLowerCase()
    );

    return {
      success,
      reset,
      remaining,
    };
  }
}

export const signCommentRateLimiter = new RateLimiter({
  redisUrl: env.KV_REST_API_URL,
  redisToken: env.KV_REST_API_TOKEN,
  namespace: "@ecp.eth/demo/sign-comment",
});
