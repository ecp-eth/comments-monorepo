import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import {
  APIErrorResponseSchema,
  InputReportsCursorSchema,
} from "../../lib/schemas";
import { getIndexerDb } from "../../management/db";
import { authMiddleware } from "../../middleware/auth";
import {
  getReportsCursor,
  IndexerAPIReportsListPendingOutputSchema,
  IndexerAPIReportStatusSchema,
} from "@ecp.eth/sdk/indexer";

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
  },
});

export function setupGetReports(app: OpenAPIHono) {
  app.openapi(getReportsRoute, async (c) => {
    const { cursor, limit, sort, status } = c.req.valid("query");
    const db = getIndexerDb();

    const hasPreviousReportsQuery = cursor
      ? db
          .selectFrom("comment_reports")
          .select("id")
          .where((eb) => {
            const conditions = [];

            conditions.push(eb("status", "=", status));

            if (sort === "asc") {
              conditions.push(
                eb.or([
                  eb.and([
                    eb("created_at", "=", cursor.createdAt),
                    eb("id", "<", cursor.id),
                  ]),
                  eb("created_at", "<", cursor.createdAt),
                ]),
              );
            }

            if (sort === "desc") {
              conditions.push(
                eb.or([
                  eb.and([
                    eb("created_at", "=", cursor.createdAt),
                    eb("id", ">", cursor.id),
                  ]),
                  eb("created_at", ">", cursor.createdAt),
                ]),
              );
            }

            return eb.and(conditions);
          })
          .orderBy("created_at", sort === "desc" ? "asc" : "desc")
          .orderBy("id", sort === "desc" ? "asc" : "desc")
          .limit(1)
          .executeTakeFirst()
      : undefined;

    const reportsQuery = db
      .selectFrom("comment_reports")
      .selectAll()
      .where((eb) => {
        const conditions = [];

        conditions.push(eb("status", "=", status));

        if (cursor) {
          if (sort === "desc") {
            conditions.push(
              eb.or([
                eb.and([
                  eb("created_at", "=", cursor.createdAt),
                  eb("id", "<", cursor.id),
                ]),
                eb("created_at", "<", cursor.createdAt),
              ]),
            );
          } else {
            conditions.push(
              eb.or([
                eb.and([
                  eb("created_at", "=", cursor.createdAt),
                  eb("id", ">", cursor.id),
                ]),
                eb("created_at", ">", cursor.createdAt),
              ]),
            );
          }
        }
        return eb.and(conditions);
      })
      .orderBy("created_at", sort === "desc" ? "desc" : "asc")
      .orderBy("id", sort === "desc" ? "desc" : "asc")
      .limit(limit + 1);

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
          commentId: report.comment_id,
          reportee: report.reportee,
          message: report.message,
          createdAt: report.created_at,
          updatedAt: report.updated_at,
          status: report.status,
        })),
        pagination: {
          endCursor: endReport
            ? getReportsCursor(endReport.id, endReport.created_at)
            : undefined,
          startCursor: startReport
            ? getReportsCursor(startReport.id, startReport.created_at)
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
