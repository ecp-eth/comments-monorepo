import { LRUCache } from "lru-cache";
import { HTTPResolver, type ResolvedHTTP } from "./resolvers/http-resolver";
import { metrics } from "./metrics";
import { wrapServiceWithTracing } from "../telemetry";

const cacheMap = new LRUCache<string, Promise<ResolvedHTTP | null>>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});

export const httpResolverService = wrapServiceWithTracing(
  new HTTPResolver({
    cacheMap,
    metrics,
  }),
);
