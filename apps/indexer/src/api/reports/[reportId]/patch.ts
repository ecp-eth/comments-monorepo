import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import { APIErrorResponseSchema } from "../../../lib/schemas";
import { getIndexerDb } from "../../../management/db";
import { authMiddleware } from "../../../middleware/auth";
import {
  IndexerAPIReportOutputSchema,
  IndexerAPIReportStatusSchema,
} from "@ecp.eth/sdk/indexer";

const PatchReportParamsSchema = z.object({
  reportId: z.string().uuid(),
});

const PatchReportBodySchema = z.object({
  status: IndexerAPIReportStatusSchema,
});

const patchReportRoute = createRoute({
  method: "patch",
  path: "/api/reports/{reportId}",
  middleware: [authMiddleware()],
  tags: ["reports"],
  description: "Update a report's status",
  request: {
    params: PatchReportParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: PatchReportBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Report updated successfully",
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

export function setupPatchReport(app: OpenAPIHono) {
  app.openapi(patchReportRoute, async (c) => {
    const { reportId } = c.req.valid("param");
    const { status } = c.req.valid("json");
    const db = getIndexerDb();

    const report = await db
      .selectFrom("comment_reports")
      .selectAll()
      .where("id", "=", reportId)
      .executeTakeFirst();

    if (!report) {
      return c.json(
        {
          message: "Report not found",
        },
        404,
      );
    }

    const updatedReport = await db
      .updateTable("comment_reports")
      .set({
        status,
        updated_at: new Date(),
      })
      .where("id", "=", reportId)
      .returningAll()
      .executeTakeFirstOrThrow();

    return c.json(
      {
        id: updatedReport.id,
        commentId: updatedReport.comment_id,
        reportee: updatedReport.reportee,
        message: updatedReport.message,
        createdAt: updatedReport.created_at,
        updatedAt: updatedReport.updated_at,
        status,
      },
      200,
    );
  });

  return app;
}
