import { createReplyCountsByParentIdResolver } from "../resolvers/reply-counts-by-parent-id-resolver";
import { db } from "./db";
import { metrics } from "./metrics";

export const replyCountsByParentIdResolverService =
  createReplyCountsByParentIdResolver({
    db,
    cache: false,
    metrics,
  });
