import { RateLimiter } from "@ecp.eth/shared-signer/services/rate-limiter";
import { env } from "@/lib/env";
import { createNonceManager } from "viem";
import { jsonRpc } from "viem/nonce";

export const rateLimiter = new RateLimiter({
  redisUrl: env.KV_REST_API_URL,
  redisToken: env.KV_REST_API_TOKEN,
  namespace: env.RATE_LIMITER_NAMESPACE,
});

export const nonceManager = createNonceManager({
  source: jsonRpc(),
});
