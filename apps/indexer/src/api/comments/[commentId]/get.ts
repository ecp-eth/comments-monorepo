import { db } from "ponder:api";
import schema from "ponder:schema";
import { and, desc, eq, inArray, isNotNull, isNull, or } from "ponder";
import { IndexerAPICommentWithRepliesOutputSchema } from "@ecp.eth/sdk/indexer/schemas";
import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import {
  createUserDataAndFormatSingleCommentResponseResolver,
  mapReplyCountsByCommentId,
} from "../../../lib/response-formatters";
import { env } from "../../../env";
import { COMMENT_TYPE_REACTION } from "@ecp.eth/sdk";
import type { SQL } from "drizzle-orm";
import {
  APIErrorResponseSchema,
  GetCommentParamSchema,
  GetCommentQuerySchema,
} from "../../../lib/schemas";
import { REPLIES_PER_COMMENT } from "../../../lib/constants";
import { type Hex } from "@ecp.eth/sdk/core";
import { farcasterByAddressResolverService } from "../../../services/farcaster-by-address-resolver";
import { ensByAddressResolverService } from "../../../services/ens-by-address-resolver";

const getCommentRoute = createRoute({
  method: "get",
  path: "/api/comments/{commentId}",
  tags: ["comments"],
  description: "Retrieve a single comment by ID",
  request: {
    params: GetCommentParamSchema,
    query: GetCommentQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: IndexerAPICommentWithRepliesOutputSchema,
        },
      },
      description: "A single comment",
    },
    404: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "Comment not found",
    },
  },
});

/**
 * Setup Single Comment API
 *
 * @param app - The Hono app instance
 * @returns hono app instance
 */
export const setupGetComment = (app: OpenAPIHono) => {
  app.openapi(getCommentRoute, async (c) => {
    const { commentId } = c.req.valid("param");
    const { viewer, chainId, mode, commentType, isReplyDeleted } =
      c.req.valid("query");

    const sharedConditions: (SQL<unknown> | undefined)[] = [
      eq(schema.comment.id, commentId as `0x${string}`),
      chainId.length === 1
        ? eq(schema.comment.chainId, chainId[0]!)
        : inArray(schema.comment.chainId, chainId),
    ];

    const repliesConditions: (SQL<unknown> | undefined)[] = [
      isReplyDeleted != null
        ? isReplyDeleted
          ? isNotNull(schema.comment.deletedAt)
          : isNull(schema.comment.deletedAt)
        : undefined,
    ];
    const viewerReactionsConditions: (SQL<unknown> | undefined)[] = [];

    // Apply moderation filtering to replies
    if (env.MODERATION_ENABLED) {
      const approvedComments = eq(schema.comment.moderationStatus, "approved");

      if (viewer) {
        const approvedOrViewersComments = or(
          approvedComments,
          eq(schema.comment.author, viewer),
        );

        repliesConditions.push(approvedOrViewersComments);
      } else {
        repliesConditions.push(approvedComments);
      }
    }

    if (viewer) {
      viewerReactionsConditions.push(
        eq(schema.comment.author, viewer as `0x${string}`),
        eq(schema.comment.commentType, COMMENT_TYPE_REACTION),
        isNull(schema.comment.deletedAt),
      );
    }

    const comment = await db.query.comment.findFirst({
      with: {
        [mode === "flat" ? "flatReplies" : "replies"]: {
          where: and(
            ...repliesConditions,
            commentType != null
              ? eq(schema.comment.commentType, commentType)
              : undefined,
          ),
          orderBy: [desc(schema.comment.createdAt), desc(schema.comment.id)],
          limit: REPLIES_PER_COMMENT + 1,
          with: {
            viewerReactions: viewer
              ? {
                  where: and(
                    ...repliesConditions,
                    ...viewerReactionsConditions,
                  ),
                }
              : undefined,
          },
        },
        viewerReactions: viewer
          ? {
              where: and(...repliesConditions, ...viewerReactionsConditions),
            }
          : undefined,
      },
      where: and(...sharedConditions),
    });

    if (!comment) {
      return c.json({ message: "Comment not found" }, 404);
    }

    const authorAddresses = new Set<Hex>();

    if (comment.author) {
      authorAddresses.add(comment.author);
    }

    const replies = mode === "flat" ? comment.flatReplies : comment.replies;

    for (const reply of replies) {
      if (reply.author) {
        authorAddresses.add(reply.author);
      }
    }

    const [resolvedAuthorsEnsData, resolvedAuthorsFarcasterData, replyCounts] =
      await Promise.all([
        ensByAddressResolverService.loadMany([...authorAddresses]),
        farcasterByAddressResolverService.loadMany([...authorAddresses]),
        mapReplyCountsByCommentId([comment], {
          mode,
          isDeleted: isReplyDeleted,
          commentType,
        }),
      ]);

    const resolveUserDataAndFormatSingleCommentResponse =
      createUserDataAndFormatSingleCommentResponseResolver({
        replyLimit: REPLIES_PER_COMMENT,
        resolvedAuthorsEnsData,
        resolvedAuthorsFarcasterData,
        replyCounts,
      });

    const formattedComment =
      await resolveUserDataAndFormatSingleCommentResponse(comment);

    return c.json(
      IndexerAPICommentWithRepliesOutputSchema.parse(formattedComment),
      200,
    );
  });

  return app;
};
