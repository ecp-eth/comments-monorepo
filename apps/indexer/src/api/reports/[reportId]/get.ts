import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import { APIErrorResponseSchema } from "../../../lib/schemas";
import { getIndexerDb } from "../../../management/db";
import { authMiddleware } from "../../../middleware/auth";
import { IndexerAPIReportOutputSchema } from "@ecp.eth/sdk/indexer";

const GetReportParamsSchema = z.object({
  reportId: z.string().uuid(),
});

const getReportRoute = createRoute({
  method: "get",
  path: "/api/reports/{reportId}",
  middleware: [authMiddleware()],
  tags: ["reports"],
  description: "Get a report by ID",
  request: {
    params: GetReportParamsSchema,
  },
  responses: {
    200: {
      description: "Report details",
      content: {
        "application/json": {
          schema: IndexerAPIReportOutputSchema,
        },
      },
    },
    400: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "When request is not valid",
    },
    401: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "When user is not authenticated",
    },
    404: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "When report is not found",
    },
  },
});

export function setupGetReport(app: OpenAPIHono) {
  app.openapi(getReportRoute, async (c) => {
    const { reportId } = c.req.valid("param");
    const db = getIndexerDb();

    const report = await db
      .selectFrom("comment_reports")
      .selectAll()
      .where("id", "=", reportId)
      .executeTakeFirst();

    if (!report) {
      return c.json({ message: "Report not found" }, 404);
    }

    return c.json(
      {
        id: report.id,
        commentId: report.comment_id,
        reportee: report.reportee,
        message: report.message,
        createdAt: report.created_at,
        updatedAt: report.updated_at,
        status: report.status,
      },
      200,
    );
  });

  return app;
}
