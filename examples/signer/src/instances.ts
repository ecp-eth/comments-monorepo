import { RateLimiter } from "@ecp.eth/shared/services/rate-limiter";
import { env } from "@/lib/env";

export const rateLimiter = new RateLimiter({
  redisUrl: env.KV_REST_API_URL,
  redisToken: env.KV_REST_API_TOKEN,
  namespace: env.RATE_LIMITER_NAMESPACE,
});
