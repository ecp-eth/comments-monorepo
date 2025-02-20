import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { and, asc, client, desc, eq, graphql, isNull } from "ponder";
import {
  HexSchema,
  IndexerAPIListCommentRepliesSchema,
  IndexerAPIListCommentsSchema,
} from "@ecp.eth/sdk/schemas";
import { resolveUserDataAndFormatListCommentsResponse } from "../lib/response-formatters";
import {
  ListApprovalsSearchParamsSchema,
  ListCommentRepliesSerchParamsSchema,
  ListCommentsSearchParamsSchema,
} from "../lib/schemas";

const app = new Hono();

app.use("/sql/*", client({ db, schema }));
app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));
app.use("/api/*", cors());

const REPLIES_PER_COMMENT = 2;

app.get("/api/comments", async (c) => {
  const url = new URL(c.req.url);
  const parseSearchParamsResult = ListCommentsSearchParamsSchema.safeParse(
    Object.fromEntries(url.searchParams.entries())
  );

  if (!parseSearchParamsResult.success) {
    return c.json(parseSearchParamsResult.error.flatten().fieldErrors, 400);
  }

  const { targetUri, appSigner, sort, limit, offset } =
    parseSearchParamsResult.data;

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
    offset,
  });

  const comments = await query.execute();

  const formattedComments = await resolveUserDataAndFormatListCommentsResponse({
    comments,
    limit,
    offset,
    replyLimit: REPLIES_PER_COMMENT,
  });

  return c.json(IndexerAPIListCommentsSchema.parse(formattedComments));
});

app.get("/api/comments/:commentId/replies", async (c) => {
  const url = new URL(c.req.url);
  const parseSearchParamsResult = ListCommentRepliesSerchParamsSchema.safeParse(
    Object.fromEntries(url.searchParams.entries())
  );

  if (!parseSearchParamsResult.success) {
    return c.json(parseSearchParamsResult.error.flatten().fieldErrors, 400);
  }

  const parseCommentIdResult = HexSchema.safeParse(c.req.param("commentId"));

  if (!parseCommentIdResult.success) {
    return c.json(parseCommentIdResult.error.flatten().fieldErrors, 400);
  }

  const { appSigner, sort, limit, offset } = parseSearchParamsResult.data;
  const commentId = parseCommentIdResult.data;

  const query = db.query.comment.findMany({
    where: and(
      eq(schema.comment.parentId, commentId),
      appSigner ? eq(schema.comment.appSigner, appSigner) : undefined
    ),
    orderBy:
      sort === "desc"
        ? desc(schema.comment.timestamp)
        : asc(schema.comment.timestamp),
    limit: limit + 1,
    offset,
  });

  const replies = await query.execute();

  const formattedComments = await resolveUserDataAndFormatListCommentsResponse({
    comments: replies,
    limit,
    offset,
    replyLimit: REPLIES_PER_COMMENT,
  });

  return c.json(IndexerAPIListCommentRepliesSchema.parse(formattedComments));
});

app.get("/api/approvals", async (c) => {
  const url = new URL(c.req.url);
  const parseSearchParamsResult = ListApprovalsSearchParamsSchema.safeParse(
    Object.fromEntries(url.searchParams.entries())
  );

  if (!parseSearchParamsResult.success) {
    return c.json(parseSearchParamsResult.error.flatten().fieldErrors, 400);
  }

  const { author, appSigner, limit, offset } = parseSearchParamsResult.data;

  const query = db.query.approvals.findMany({
    where: and(
      eq(schema.approvals.author, author),
      eq(schema.approvals.appSigner, appSigner)
    ),
    orderBy: desc(schema.approvals.deletedAt),
    limit: limit + 1,
    offset,
  });

  const approvals = await query.execute();

  const res = {
    results: approvals.slice(0, limit),
    pagination: {
      limit,
      offset,
      hasMore: approvals.length > limit,
    },
  };

  return c.json(res);
});

export default app;
