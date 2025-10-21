import { createReplyCountsByParentIdResolver } from "../resolvers";
import { db } from "./db";

export const replyCountsByParentIdResolverService =
  createReplyCountsByParentIdResolver({
    db,
    cache: false,
  });
