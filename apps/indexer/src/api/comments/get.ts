import { db } from "ponder:api";
import schema, { CommentSelectType } from "ponder:schema";
import { and, asc, desc, eq, gt, isNull, lt, or, sql } from "ponder";
import { type Hex, IndexerAPIListCommentsSchema } from "@ecp.eth/sdk/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { resolveUserDataAndFormatListCommentsResponse } from "../../lib/response-formatters";
import { GetCommentsQuerySchema } from "../../lib/schemas";
import { REPLIES_PER_COMMENT } from "../../lib/constants";
import { env } from "../../env";
import type { SQL } from "drizzle-orm";
import type { SnakeCasedProperties } from "type-fest";

type RawQueryResultSelectType = SnakeCasedProperties<
  typeof schema.comments.$inferSelect
>;

const getCommentsRoute = createRoute({
  method: "get",
  path: "/api/comments",
  tags: ["comments"],
  description: "Retrieve a list of comments based on the criteria",
  request: {
    query: GetCommentsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: IndexerAPIListCommentsSchema,
        },
      },
      description: "Retrieve a list of comments",
    },
  },
});

/**
 * Setup Comments API
 *
 * @param app - The Hono app instance
 * @returns hono app instance
 */
export default (app: OpenAPIHono) => {
  app.openapi(getCommentsRoute, async (c) => {
    const { author, targetUri, appSigner, sort, limit, cursor, viewer, mode } =
      c.req.valid("query");

    const sharedConditions = [
      author ? eq(schema.comments.author, author) : undefined,
      isNull(schema.comments.parentId),
      targetUri ? eq(schema.comments.targetUri, targetUri) : undefined,
      appSigner ? eq(schema.comments.appSigner, appSigner) : undefined,
    ];

    const repliesConditions: (SQL<unknown> | undefined)[] = [];

    if (env.MODERATION_ENABLED) {
      const approvedComments = eq(schema.comments.moderationStatus, "approved");

      if (viewer) {
        const approvedOrViewersComments = or(
          approvedComments,
          eq(schema.comments.author, viewer)
        );

        sharedConditions.push(approvedOrViewersComments);
        repliesConditions.push(approvedOrViewersComments);
      } else {
        sharedConditions.push(approvedComments);
        repliesConditions.push(approvedComments);
      }
    }

    if (mode === "flat") {
      repliesConditions.push(
        sql`${schema.comments.commentPath} && ARRAY[rc.id]`
      );
    } else {
      repliesConditions.push(eq(schema.comments.parentId, sql`rc.id`));
    }

    const hasPreviousCommentsQuery = cursor
      ? db.query.comments
          .findFirst({
            where: and(
              ...sharedConditions,
              // use opposite order for asc and desc
              ...(sort === "asc"
                ? [
                    or(
                      and(
                        eq(schema.comments.timestamp, cursor.timestamp),
                        lt(schema.comments.id, cursor.id)
                      ),
                      lt(schema.comments.timestamp, cursor.timestamp)
                    ),
                  ]
                : []),
              ...(sort === "desc"
                ? [
                    or(
                      and(
                        eq(schema.comments.timestamp, cursor.timestamp),
                        gt(schema.comments.id, cursor.id)
                      ),
                      gt(schema.comments.timestamp, cursor.timestamp)
                    ),
                  ]
                : [])
            ),
            orderBy:
              sort === "desc"
                ? [asc(schema.comments.timestamp), asc(schema.comments.id)]
                : [desc(schema.comments.timestamp), desc(schema.comments.id)],
          })
          .execute()
      : undefined;

    const commentsQuery = db.execute<RawQueryResultSelectType>(
      sql`
      WITH root_comments AS (
        SELECT * FROM ${schema.comments}
        WHERE ${and(
          ...sharedConditions,
          ...(sort === "desc" && !!cursor
            ? [
                or(
                  and(
                    eq(schema.comments.timestamp, cursor.timestamp),
                    lt(schema.comments.id, cursor.id)
                  ),
                  lt(schema.comments.timestamp, cursor.timestamp)
                ),
              ]
            : []),
          ...(sort === "asc" && !!cursor
            ? [
                or(
                  and(
                    eq(schema.comments.timestamp, cursor.timestamp),
                    gt(schema.comments.id, cursor.id)
                  ),
                  gt(schema.comments.timestamp, cursor.timestamp)
                ),
              ]
            : [])
        )}
        ORDER BY ${sort === "desc" ? sql`${schema.comments.timestamp} DESC, ${schema.comments.id} DESC` : sql`${schema.comments.timestamp} ASC, ${schema.comments.id} ASC`}
        LIMIT ${limit + 1}
      )
      
      SELECT * FROM root_comments
      UNION ALL 
      SELECT replies.* FROM root_comments rc
      JOIN LATERAL (
        SELECT * FROM ${schema.comments}
        WHERE ${and(...repliesConditions)}
        ORDER BY ${sort === "desc" ? sql`${schema.comments.timestamp} DESC, ${schema.comments.id} DESC` : sql`${schema.comments.timestamp} ASC, ${schema.comments.id} ASC`}
        LIMIT ${REPLIES_PER_COMMENT + 1}
      ) AS replies ON (true)
    `
    );

    const [comments, previousComment] = await Promise.all([
      commentsQuery,
      hasPreviousCommentsQuery,
    ]);

    const formattedComments =
      await resolveUserDataAndFormatListCommentsResponse({
        comments: convertUnionToCommentsWithReplies(comments.rows),
        limit,
        previousComment,
        replyLimit: REPLIES_PER_COMMENT,
      });

    return c.json(IndexerAPIListCommentsSchema.parse(formattedComments), 200);
  });

  return app;
};

function convertUnionToCommentsWithReplies(
  comments: RawQueryResultSelectType[]
): (CommentSelectType & { replies: CommentSelectType[] })[] {
  const repliesByRootCommentId: Record<Hex, CommentSelectType[]> = {};
  const rootComments: (CommentSelectType & { replies: CommentSelectType[] })[] =
    [];

  function normalizeId(id: CommentSelectType["id"]): Hex {
    return id.toLowerCase() as Hex;
  }

  function getReplies(id: CommentSelectType["id"]): CommentSelectType[] {
    const normalizedId = normalizeId(id);

    return (repliesByRootCommentId[normalizedId] =
      repliesByRootCommentId[normalizedId] ?? []);
  }

  for (const rootComment of comments) {
    const formattedComment = formatCommentData(rootComment);

    if (formattedComment.commentPath.length === 0) {
      const replies = getReplies(formattedComment.id);

      rootComments.push({
        ...formattedComment,
        replies,
      });
    } else {
      const [rootCommentId] = formattedComment.commentPath;

      if (!rootCommentId) {
        throw new Error("Root comment not found");
      }

      const replies = getReplies(rootCommentId);

      replies.push(formattedComment);
    }
  }

  return rootComments;
}

/**
 * Fixes the comment's data because we are using raw query and drizzle is not parsing those automatically
 */
function formatCommentData(
  comment: RawQueryResultSelectType
): CommentSelectType {
  return {
    id: comment.id,
    appSigner: comment.app_signer,
    author: comment.author,
    chainId: comment.chain_id,
    content: comment.content,
    deletedAt:
      comment.deleted_at && !(comment.deleted_at instanceof Date)
        ? new Date(comment.deleted_at)
        : comment.deleted_at,
    moderationStatus: comment.moderation_status,
    moderationStatusChangedAt:
      comment.moderation_status_changed_at &&
      !(comment.moderation_status_changed_at instanceof Date)
        ? new Date(comment.moderation_status_changed_at)
        : comment.moderation_status_changed_at,
    commentPath: comment.comment_path,
    metadata: comment.metadata,
    parentId: comment.parent_id,
    targetUri: comment.target_uri,
    timestamp:
      comment.timestamp && !(comment.timestamp instanceof Date)
        ? new Date(comment.timestamp)
        : comment.timestamp,
    txHash: comment.tx_hash,
    logIndex: comment.log_index,
  };
}
