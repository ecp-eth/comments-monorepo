import { ReplyCountsByParentIdResolver } from "./resolvers/reply-counts-by-parent-id-resolver";
import { db } from "./db";
import { metrics } from "./metrics";
import { wrapServiceWithTracing } from "../telemetry";

export const replyCountsByParentIdResolverService = wrapServiceWithTracing(
  new ReplyCountsByParentIdResolver({
    db,
    cache: false,
    metrics,
  }),
);
