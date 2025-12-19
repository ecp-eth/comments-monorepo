import { IndexerAPICommentWithRepliesOutputSchema } from "@ecp.eth/sdk/indexer";
import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import {
  APIBadRequestResponseSchema,
  APIErrorResponseSchema,
  GetCommentQuerySchema,
} from "../../../../../lib/schemas";
import { isEthName } from "../../../../../services/resolvers";
import { ensByNameResolverService } from "../../../../../services/ens-by-name-resolver";
import { db } from "../../../../../services";
import schema from "ponder:schema";
import type { Hex } from "@ecp.eth/sdk/core";
import { eq } from "ponder";
import { fetchCommentWithReplies } from "../../../fetchers";
import { formatCommentWithRepliesResponse } from "../../../formatters";
import { isEthAddress } from "../../../../../lib/utils";

const getCommentsByPathRoute = createRoute({
  method: "get",
  path: "/api/comments/by-path/{authorShortId}/{commentShortId}",
  tags: ["comments"],
  description: "Retrieve a single comment by path",
  request: {
    params: z.object({
      authorShortId: z.string().openapi({
        description: "The author short id, whole address or ENS name",
      }),
      commentShortId: z
        .string()
        .regex(/^0x[a-fA-F0-9]+(\.\.\.)?[a-fA-F0-9]+$/)
        .transform((val) => val as `0x${string}...${string}` | Hex)
        .openapi({
          description: "The comment short id or full comment ID in hex format",
        }),
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
    const { authorShortId, commentShortId } = c.req.valid("param");
    const { viewer, chainId, mode, commentType, isReplyDeleted } =
      c.req.valid("query");

    const commentPathId = await resolveCommentPathId(commentShortId);
    const authorPathId = await resolveAuthorShortId(authorShortId);

    if (!commentPathId || !authorPathId) {
      return c.json({ message: "Not found" }, 404);
    }

    const path = `${authorPathId}/${commentPathId}`;

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

async function resolveCommentPathId(
  commentShortId: Hex | `0x${string}...${string}`,
): Promise<`0x${string}...${string}` | Hex | undefined> {
  if (commentShortId.includes("...")) {
    return commentShortId.toLowerCase() as `0x${string}...${string}`;
  }

  const commentShortIdRow = await db.query.commentShortIds.findFirst({
    where(fields, operators) {
      return operators.eq(
        fields.commentId,
        commentShortId.toLowerCase() as Hex,
      );
    },
  });

  return commentShortIdRow?.shortId;
}

async function resolveAuthorShortId(
  authorShortId: string | Hex | `0x${string}...${string}`,
): Promise<Hex | `0x${string}...${string}` | undefined> {
  if (authorShortId.includes("...")) {
    return authorShortId.toLowerCase() as `0x${string}...${string}`;
  }

  let resolvedAddress: Hex;

  if (isEthName(authorShortId)) {
    const ens = await ensByNameResolverService.load(authorShortId);

    if (!ens) {
      return undefined;
    }

    resolvedAddress = ens.address;
  } else if (isEthAddress(authorShortId)) {
    resolvedAddress = authorShortId;
  } else {
    return undefined;
  }

  const shortId = await db.query.authorShortIds.findFirst({
    where(fields, operators) {
      return operators.eq(
        fields.authorAddress,
        resolvedAddress.toLowerCase() as Hex,
      );
    },
  });

  return shortId?.shortId;
}
