import { LRUCache } from "lru-cache";
import {
  createHTTPResolver,
  type ResolvedHTTP,
} from "./resolvers/http-resolver";
import { metrics } from "./metrics";

const cacheMap = new LRUCache<string, Promise<ResolvedHTTP | null>>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});

export const httpResolverService = createHTTPResolver({
  cacheMap,
  metrics,
});
