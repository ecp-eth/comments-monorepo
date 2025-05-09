import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { db } from "ponder:api";
import schema from "ponder:schema";
import { and, desc, eq } from "ponder";
import {
  GetApprovalsQuerySchema,
  GetApprovalsResponseSchema,
} from "../../lib/schemas";

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
  },
});

export default (app: OpenAPIHono) => {
  app.openapi(getApprovalsRoute, async (c) => {
    const { author, app, limit, offset } = c.req.valid("query");

    const query = db.query.approvals.findMany({
      where: and(
        eq(schema.approvals.author, author),
        eq(schema.approvals.app, app)
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

  return app;
};
