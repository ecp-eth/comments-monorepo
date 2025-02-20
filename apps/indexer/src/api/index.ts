import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { cors } from "hono/cors"
import { and, asc, client, desc, eq, graphql, isNull } from "ponder";
import { normalizeUrl } from "../lib/utils";
import type { APIListCommentsResponse } from "../lib/types";
import { resolveEnsAndFormatListCommentsResponse } from "../lib/response-formatters";

const app = new Hono();

app.use("/sql/*", client({ db, schema }));
app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));
app.use("/api/*", cors())

const REPLIES_PER_COMMENT = 2;

app.get("/api/comments", async (c) => {
  let targetUri = c.req.query("targetUri");
  const appSigner = c.req.query("appSigner");
  const limit = parseInt(c.req.query("limit") ?? "50");
  const offset = parseInt(c.req.query("offset") ?? "0");
  const sort = c.req.query("sort") ?? "desc";

  if (targetUri) {
    targetUri = normalizeUrl(targetUri);
  }

  const query = db.query.comment.findMany({
    with: {
      replies: {
        orderBy: desc(schema.comment.timestamp),
        limit: REPLIES_PER_COMMENT + 1,
      },
    },
    where: and(
      isNull(schema.comment.parentId),
      targetUri ? eq(schema.comment.targetUri, targetUri) : undefined,
      appSigner
        ? eq(schema.comment.appSigner, appSigner as `0x${string}`)
        : undefined
    ),
    orderBy:
      sort === "desc"
        ? desc(schema.comment.timestamp)
        : asc(schema.comment.timestamp),
    limit: limit + 1,
    offset: offset,
  });

  const comments = await query.execute();

  const formattedComments = await resolveEnsAndFormatListCommentsResponse({
    comments,
    limit,
    offset,
    replyLimit: REPLIES_PER_COMMENT,
  });

  return c.json<APIListCommentsResponse>(formattedComments);
});

app.get("/api/comments/:commentId/replies", async (c) => {
  const appSigner = c.req.query("appSigner");
  const commentId = c.req.param("commentId");
  const limit = parseInt(c.req.query("limit") ?? "50");
  const offset = parseInt(c.req.query("offset") ?? "0");
  const sort = c.req.query("sort") ?? "desc";

  const query = db.query.comment.findMany({
    where: and(
      eq(schema.comment.parentId, commentId as `0x${string}`),
      appSigner
        ? eq(schema.comment.appSigner, appSigner as `0x${string}`)
        : undefined
    ),
    orderBy:
      sort === "desc"
        ? desc(schema.comment.timestamp)
        : asc(schema.comment.timestamp),
    limit: limit + 1,
    offset: offset,
  });

  const replies = await query.execute();

  const formattedComments = await resolveEnsAndFormatListCommentsResponse({
    comments: replies,
    limit,
    offset,
    replyLimit: REPLIES_PER_COMMENT,
  });

  return c.json<APIListCommentsResponse>(formattedComments);
});

app.get("/api/approvals", async (c) => {
  const author = c.req.query("author");
  const appSigner = c.req.query("appSigner");
  const limit = parseInt(c.req.query("limit") ?? "50");
  const offset = parseInt(c.req.query("offset") ?? "0");

  const query = db.query.approvals.findMany({
    where: and(
      eq(schema.approvals.author, author as `0x${string}`),
      eq(schema.approvals.appSigner, appSigner as `0x${string}`)
    ),
    orderBy: desc(schema.approvals.deletedAt),
    limit: limit + 1,
    offset: offset,
  });

  const approvals = await query.execute();

  const res = {
    results: approvals,
    pagination: {
      limit,
      offset,
      hasMore: approvals.length > limit,
    },
  };

  return c.json(res);
});

export default app;
