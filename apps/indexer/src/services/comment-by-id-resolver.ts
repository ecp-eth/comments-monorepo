import { CommentByIdResolver } from "./resolvers/comment-by-id-resolver";
import { db } from "./db";
import { metrics } from "./metrics";
import { wrapServiceWithTracing } from "../telemetry";

export const commentByIdResolverService = wrapServiceWithTracing(
  new CommentByIdResolver({
    db,
    cache: false,
    metrics,
  }),
);
