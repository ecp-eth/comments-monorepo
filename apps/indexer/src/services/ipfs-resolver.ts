import { LRUCache } from "lru-cache";
import { createIPFSResolver } from "../resolvers/ipfs-resolver.ts";
import type { ResolvedHTTP } from "../resolvers/http-resolver.ts";
import { httpResolverService } from "./http-resolver.ts";
import { PinataSDK } from "pinata";
import { env } from "../env.ts";

const cacheMap = new LRUCache<string, Promise<ResolvedHTTP | null>>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});

const pinataSDK = new PinataSDK({
  pinataJwt: env.PINATA_JWT,
  pinataGateway: env.PINATA_GATEWAY,
});

export const ipfsResolverService = createIPFSResolver({
  cacheMap,
  pinataSDK,
  httpResolver: httpResolverService,
  retryCount: env.IPFS_RESOLUTION_RETRY_COUNT,
  retryTimeout: env.IPFS_RESOLUTION_RETRY_TIMEOUT,
});
