import { RateLimiter } from "@ecp.eth/shared/services/rate-limiter";
import { env } from "../env";

export const signCommentRateLimiter = new RateLimiter({
  redisUrl: env.KV_REST_API_URL,
  redisToken: env.KV_REST_API_TOKEN,
  namespace: "@ecp.eth/embed/sign-comment",
});
