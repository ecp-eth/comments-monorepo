import { LRUCache } from "lru-cache";
import { IPFSResolver } from "./resolvers/ipfs-resolver";
import type { ResolvedHTTP } from "./resolvers/http-resolver";
import { httpResolverService } from "./http-resolver";
import { PinataSDK } from "pinata";
import { env } from "../env";
import { metrics } from "./metrics";
import { wrapServiceWithTracing } from "../telemetry";

const cacheMap = new LRUCache<string, Promise<ResolvedHTTP | null>>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});

const pinataSDK = new PinataSDK({
  pinataJwt: env.PINATA_JWT,
  pinataGateway: env.PINATA_GATEWAY,
});

export const ipfsResolverService = wrapServiceWithTracing(
  new IPFSResolver({
    cacheMap,
    pinataSDK,
    httpResolver: httpResolverService,
    retryCount: env.IPFS_RESOLUTION_RETRY_COUNT,
    retryTimeout: env.IPFS_RESOLUTION_RETRY_TIMEOUT,
    metrics,
  }),
);
