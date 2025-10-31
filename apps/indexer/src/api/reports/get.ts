import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import {
  APIBadRequestResponseSchema,
  APIErrorResponseSchema,
  InputReportsCursorSchema,
} from "../../lib/schemas";
import { authMiddleware } from "../../middleware/auth";
import {
  getReportsCursor,
  IndexerAPIReportsListPendingOutputSchema,
  IndexerAPIReportStatusSchema,
} from "@ecp.eth/sdk/indexer";
import { db } from "../../services";
import { and, asc, desc, eq, gt, lt, or } from "drizzle-orm";
import { schema } from "../../../schema";

const GetReportsQuerySchema = z.object({
  cursor: InputReportsCursorSchema.optional().openapi({
    description:
      "Non inclusive cursor from which to fetch the reports based on sort",
    type: "string",
    pattern: "^0x[a-fA-F0-9]+$",
  }),
  limit: z.number().int().min(1).max(100).default(10).openapi({
    description: "The number of reports to return",
  }),
  sort: z.enum(["asc", "desc"]).default("desc").openapi({
    description: "The sort order of the reports",
  }),
  status: IndexerAPIReportStatusSchema.default("pending"),
});

const getReportsRoute = createRoute({
  method: "get",
  path: "/api/reports",
  middleware: [authMiddleware()],
  tags: ["reports"],
  description: "Get a list of comment reports",
  request: {
    query: GetReportsQuerySchema,
  },
  responses: {
    200: {
      description: "List of comment reports",
      content: {
        "application/json": {
          schema: IndexerAPIReportsListPendingOutputSchema,
        },
      },
    },
    400: {
      content: {
        "application/json": {
          schema: APIBadRequestResponseSchema,
        },
      },
      description: "Bad request",
    },
    401: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "When user is not authenticated",
    },
  },
});

export function setupGetReports(app: OpenAPIHono) {
  app.openapi(getReportsRoute, async (c) => {
    const { cursor, limit, sort, status } = c.req.valid("query");

    const hasPreviousReportsQuery = cursor
      ? db.query.commentReports
          .findFirst({
            columns: {
              id: true,
            },
            where: and(
              eq(schema.commentReports.status, status),
              sort === "asc"
                ? or(
                    and(
                      eq(schema.commentReports.createdAt, cursor.createdAt),
                      lt(schema.commentReports.id, cursor.id),
                    ),
                    lt(schema.commentReports.createdAt, cursor.createdAt),
                  )
                : undefined,
              sort === "desc"
                ? or(
                    and(
                      eq(schema.commentReports.createdAt, cursor.createdAt),
                      gt(schema.commentReports.id, cursor.id),
                    ),
                    gt(schema.commentReports.createdAt, cursor.createdAt),
                  )
                : undefined,
            ),
            orderBy: [
              sort === "desc"
                ? asc(schema.commentReports.createdAt)
                : desc(schema.commentReports.createdAt),
              sort === "desc"
                ? asc(schema.commentReports.id)
                : desc(schema.commentReports.id),
            ],
          })
          .execute()
      : undefined;

    const reportsQuery = db.query.commentReports.findMany({
      where: and(
        eq(schema.commentReports.status, status),
        sort === "asc" && cursor
          ? or(
              and(
                eq(schema.commentReports.createdAt, cursor.createdAt),
                gt(schema.commentReports.id, cursor.id),
              ),
              gt(schema.commentReports.createdAt, cursor.createdAt),
            )
          : undefined,
        sort === "desc" && cursor
          ? or(
              and(
                eq(schema.commentReports.createdAt, cursor.createdAt),
                lt(schema.commentReports.id, cursor.id),
              ),
              lt(schema.commentReports.createdAt, cursor.createdAt),
            )
          : undefined,
      ),
      orderBy: [
        sort === "desc"
          ? desc(schema.commentReports.createdAt)
          : asc(schema.commentReports.createdAt),
        sort === "desc"
          ? desc(schema.commentReports.id)
          : asc(schema.commentReports.id),
      ],
      limit: limit + 1,
    });

    const [reports, previousReport] = await Promise.all([
      reportsQuery.execute(),
      hasPreviousReportsQuery,
    ]);

    const hasNextPage = reports.length > limit;

    if (hasNextPage) {
      reports.pop(); // Remove the extra item we fetched to check for next page
    }

    const hasPreviousPage = !!previousReport;

    const startReport = reports[0];
    const endReport = reports[reports.length - 1];

    return c.json(
      {
        results: reports.map((report) => ({
          id: report.id,
          commentId: report.commentId,
          reportee: report.reportee,
          message: report.message,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
          status: report.status,
        })),
        pagination: {
          endCursor: endReport
            ? getReportsCursor(endReport.id, endReport.createdAt)
            : undefined,
          startCursor: startReport
            ? getReportsCursor(startReport.id, startReport.createdAt)
            : undefined,
          limit,
          hasNext: hasNextPage,
          hasPrevious: hasPreviousPage,
        },
      },
      200,
    );
  });

  return app;
}
