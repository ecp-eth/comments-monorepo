import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import { APIErrorResponseSchema } from "../../../lib/schemas";
import { authMiddleware } from "../../../middleware/auth";
import {
  IndexerAPIReportOutputSchema,
  IndexerAPIReportStatusSchema,
} from "@ecp.eth/sdk/indexer";
import { managementCommentDbService } from "../../../services";
import { ReportNotFoundError } from "../../../management/services/comment-db-service";

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

    try {
      const updatedReport = await managementCommentDbService.updateReportStatus(
        reportId,
        status,
      );

      return c.json(
        {
          id: updatedReport.id,
          commentId: updatedReport.commentId,
          reportee: updatedReport.reportee,
          message: updatedReport.message,
          createdAt: updatedReport.createdAt,
          updatedAt: updatedReport.updatedAt,
          status,
        },
        200,
      );
    } catch (error) {
      if (error instanceof ReportNotFoundError) {
        return c.json(
          {
            message: "Report not found",
          },
          404,
        );
      }

      throw error;
    }
  });

  return app;
}
