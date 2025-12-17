import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { db } from "ponder:api";
import schema from "ponder:schema";
import { and, desc, eq, inArray } from "ponder";
import {
  APIBadRequestResponseSchema,
  APIErrorResponseSchema,
  OpenAPIChainIdSchema,
  OpenAPIDateStringSchema,
  OpenAPIHexSchema,
} from "../../lib/schemas";
import { IndexerAPIPaginationSchema } from "@ecp.eth/sdk/indexer/schemas";

/**
 * Query string schema for getting a list of approvals.
 */
export const GetApprovalsQuerySchema = z
  .object({
    author: OpenAPIHexSchema.openapi({
      description:
        "The author's address. Can be used to filter approvals by author. Either `author` or `app` must be provided or both.",
    }).optional(),
    app: OpenAPIHexSchema.openapi({
      description:
        "The address of the app signer. Can be used to filter approvals by app. Either `author` or `app` must be provided or both.",
    }).optional(),
    chainId: OpenAPIChainIdSchema,
    limit: z.coerce.number().int().positive().max(100).default(50).openapi({
      description: "The number of approvals to return",
    }),
    offset: z.coerce.number().int().min(0).default(0).openapi({
      description: "The offset of the approvals to return",
    }),
  })
  .refine(
    (val) => {
      if (val.author || val.app) {
        return true;
      }

      return false;
    },
    {
      message: "Either `author` or `app` must be provided or both.",
    },
  );

/**
 * Schema for a single approval.
 */
export const GetApprovalSchema = z.object({
  id: z.string(),
  app: OpenAPIHexSchema,
  author: OpenAPIHexSchema,
  deletedAt: OpenAPIDateStringSchema.nullable().openapi({
    type: ["string", "null"],
  }),
  chainId: z.number().int(),
  txHash: OpenAPIHexSchema,
  expiresAt: OpenAPIDateStringSchema,
});

/**
 * Response schema for getting a list of approvals.
 */
export const GetApprovalsResponseSchema = z.object({
  results: z.array(GetApprovalSchema),
  pagination: IndexerAPIPaginationSchema,
});

const getApprovalsRoute = createRoute({
  method: "get",
  path: "/api/approvals",
  tags: ["approvals"],
  description: "Retrieve a list of approvals according to the criteria",
  request: {
    query: GetApprovalsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: GetApprovalsResponseSchema,
        },
      },
      description: "Retrieve a list of approvals according to the criteria",
    },
    400: {
      content: {
        "application/json": {
          schema: APIBadRequestResponseSchema,
        },
      },
      description: "Bad request",
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
    },
  },
});

export default (app: OpenAPIHono) => {
  app.openapi(getApprovalsRoute, async (c) => {
    const { author, app, chainId, limit, offset } = c.req.valid("query");

    const query = db.query.approval.findMany({
      where: and(
        app ? eq(schema.approval.app, app) : undefined,
        author ? eq(schema.approval.author, author) : undefined,
        chainId.length === 1
          ? eq(schema.approval.chainId, chainId[0]!)
          : inArray(schema.approval.chainId, chainId),
      ),
      orderBy: desc(schema.approval.deletedAt),
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

    return c.json(res, 200);
  });

  return app;
};
