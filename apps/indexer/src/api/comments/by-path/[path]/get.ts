import { IndexerAPICommentWithRepliesOutputSchema } from "@ecp.eth/sdk/indexer";
import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import {
  APIBadRequestResponseSchema,
  APIErrorResponseSchema,
  GetCommentQuerySchema,
} from "../../../../lib/schemas";
import { isEthName } from "../../../../services/resolvers";
import { ensByNameResolverService } from "../../../../services/ens-by-name-resolver";
import { db } from "../../../../services";
import schema from "ponder:schema";
import type { Hex } from "@ecp.eth/sdk/core";
import { eq } from "ponder";
import { fetchCommentWithReplies } from "../../fetchers";
import { formatCommentWithRepliesResponse } from "../../formatters";

const getCommentsByPathRoute = createRoute({
  method: "get",
  path: "/api/comments/by-path/{path}",
  tags: ["comments"],
  description: "Retrieve a single comment by path",
  request: {
    params: z.object({
      path: z
        .string()
        .regex(/^[^/]+\/[^/]+$/)
        .transform((val) => val.split("/") as [string, string]),
    }),
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
    400: {
      content: {
        "application/json": {
          schema: APIBadRequestResponseSchema,
        },
      },
      description: "Bad request",
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

export function setupGetCommentsByPath(app: OpenAPIHono) {
  app.openapi(getCommentsByPathRoute, async (c) => {
    const {
      path: [shortAuthorId, shortCommentId],
    } = c.req.valid("param");
    const { viewer, chainId, mode, commentType, isReplyDeleted } =
      c.req.valid("query");

    let path: string;

    // if the first path of path resembles ENS name, resolve it to an address
    if (isEthName(shortAuthorId)) {
      const ens = await ensByNameResolverService.load(shortAuthorId);

      if (!ens) {
        return c.json({ message: "Not found" }, 404);
      }

      // find author short id by address
      const authorShortId = await db.query.authorShortIds.findFirst({
        where(fields, operators) {
          return operators.eq(
            fields.authorAddress,
            ens.address.toLowerCase() as Hex,
          );
        },
      });

      if (!authorShortId) {
        return c.json({ message: "Not found" }, 404);
      }

      path = `${authorShortId.shortId}/${shortCommentId}`;
    } else {
      path = `${shortAuthorId}/${shortCommentId}`;
    }

    const comment = await fetchCommentWithReplies(
      eq(schema.comment.path, path),
      {
        viewer,
        chainId,
        mode,
        commentType,
        isReplyDeleted,
      },
    );

    if (!comment) {
      return c.json({ message: "Comment not found" }, 404);
    }

    const formattedComment = await formatCommentWithRepliesResponse(comment, {
      mode,
      commentType,
      isReplyDeleted,
    });

    return c.json(
      IndexerAPICommentWithRepliesOutputSchema.parse(formattedComment),
      200,
    );
  });

  return app;
}
