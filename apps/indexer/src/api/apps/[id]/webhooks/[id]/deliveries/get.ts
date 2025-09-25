import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  appManager,
  appWebhookManager,
  db,
  siweMiddleware,
} from "../../../../../../services";
import {
  APIErrorResponseSchema,
  OpenAPIBigintStringSchema,
  OpenAPIDateStringSchema,
} from "../../../../../../lib/schemas";
import { AppManagerAppNotFoundError } from "../../../../../../services/app-manager-service";
import { AppWebhookManagerAppWebhookNotFoundError } from "../../../../../../services/app-webhook-manager-service";
import { formatResponseUsingZodSchema } from "../../../../../../lib/response-formatters";

export const AppWebhookDeliveriesGetRequestParamsSchema = z.object({
  appId: z.string().uuid(),
  webhookId: z.string().uuid(),
});

const AppWebhookDeliveriesGetRequestQueryCursorSchema = z.preprocess(
  (val) => {
    try {
      if (typeof val !== "string") {
        return val;
      }

      return JSON.parse(Buffer.from(val, "base64url").toString("utf8"));
    } catch {
      return val;
    }
  },
  z.object({
    id: z.coerce.bigint(),
  }),
);

const AppWebhookDeliveriesStatusSchema = z.enum([
  "pending",
  "processing",
  "failed",
  "success",
]);

export const AppWebhookDeliveriesGetRequestQuerySchema = z
  .object({
    before: AppWebhookDeliveriesGetRequestQueryCursorSchema.optional(),
    after: AppWebhookDeliveriesGetRequestQueryCursorSchema.optional(),
    limit: z.coerce.number().int().positive().max(100).default(10),
    status: AppWebhookDeliveriesStatusSchema.or(
      AppWebhookDeliveriesStatusSchema.array(),
    )
      .or(
        z.string().transform((val, ctx) => {
          const statuses = val.split(",").map((item) => item.trim());
          const parsed =
            AppWebhookDeliveriesStatusSchema.array().safeParse(statuses);

          if (!parsed.success) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Invalid status",
            });

            return z.NEVER;
          }

          return parsed.data;
        }),
      )
      .default([])
      .transform((val) => {
        if (Array.isArray(val)) {
          return val;
        }

        return [val];
      })
      .openapi({
        type: undefined,
        description:
          "Filter by status. It can be a single status or a comma separated list of statuses.",
        oneOf: [
          {
            type: "string",
            enum: ["pending", "processing", "failed", "success"],
          },
          {
            type: "array",
            items: {
              type: "string",
              enum: ["pending", "processing", "failed", "success"],
            },
          },
          {
            type: "string",
            format: "comma-separated-list",
            description: 'E.g. "pending,processing,failed,success"',
          },
        ],
      }),
  })
  .refine(
    (data) => {
      if (data.before && data.after) {
        return false;
      }

      return true;
    },
    { message: "Cannot use both before and after" },
  );

export const AppWebhookDeliverySchema = z.object({
  id: OpenAPIBigintStringSchema,
  createdAt: OpenAPIDateStringSchema,
  nextAttemptAt: OpenAPIDateStringSchema,
  attemptsCount: z.number().int().nonnegative(),
  status: z.enum(["pending", "processing", "failed", "success"]),
  event: z.object({
    eventType: z.string(),
  }),
});

export const AppWebhookDeliveriesCursorSchema = z
  .object({
    id: OpenAPIBigintStringSchema,
  })
  .transform((val) => Buffer.from(JSON.stringify(val)).toString("base64url"));

export const AppWebhookDeliveriesGetResponseSchema = z.object({
  results: z.array(
    z.object({
      cursor: AppWebhookDeliveriesCursorSchema,
      item: AppWebhookDeliverySchema,
    }),
  ),
  pageInfo: z.object({
    hasPreviousPage: z.boolean(),
    hasNextPage: z.boolean(),
    startCursor: AppWebhookDeliveriesCursorSchema.optional(),
    endCursor: AppWebhookDeliveriesCursorSchema.optional(),
  }),
});

export function setupAppWebhookDeliveriesGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/apps/{appId}/webhooks/{webhookId}/deliveries",
      tags: ["apps", "webhooks", "deliveries"],
      description: "Get a list of deliveries for a webhook",
      middleware: siweMiddleware,
      request: {
        params: AppWebhookDeliveriesGetRequestParamsSchema,
        query: AppWebhookDeliveriesGetRequestQuerySchema,
      },
      responses: {
        200: {
          description: "Paginated list of deliveries",
          content: {
            "application/json": {
              schema: AppWebhookDeliveriesGetResponseSchema,
            },
          },
        },
        400: {
          description: "Invalid request",
          content: {
            "application/json": {
              schema: APIErrorResponseSchema,
            },
          },
        },
        401: {
          description: "Unauthorized",
          content: {
            "application/json": {
              schema: APIErrorResponseSchema,
            },
          },
        },
        404: {
          description: "Webhook or app not found",
          content: {
            "application/json": {
              schema: APIErrorResponseSchema,
            },
          },
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
    },
    async (c) => {
      const { appId, webhookId } = c.req.valid("param");
      const { before, after, limit, status } = c.req.valid("query");

      try {
        const { app } = await appManager.getApp({
          id: appId,
          ownerId: c.get("user").id,
        });

        const { appWebhook } = await appWebhookManager.getAppWebhook({
          appId: app.id,
          webhookId,
        });

        const previousDeliveries =
          before || after
            ? await db.query.appWebhookDelivery.findFirst({
                where(fields, operators) {
                  return operators.and(
                    operators.eq(fields.appWebhookId, appWebhook.id),
                    ...(status.length > 0
                      ? [operators.inArray(fields.status, status)]
                      : []),
                    ...(before ? [operators.gt(fields.id, before.id)] : []),
                    ...(after && !before
                      ? [operators.lt(fields.id, after.id)]
                      : []),
                  );
                },
              })
            : undefined;

        const results = await db.query.appWebhookDelivery.findMany({
          where(fields, operators) {
            return operators.and(
              operators.eq(fields.appWebhookId, appWebhook.id),
              ...(status.length > 0
                ? [operators.inArray(fields.status, status)]
                : []),
              ...(before ? [operators.gt(fields.id, before.id)] : []),
              ...(after && !before ? [operators.lt(fields.id, after.id)] : []),
            );
          },
          limit: limit + 1,
          orderBy(fields, operators) {
            if (before) {
              return operators.asc(fields.id);
            }

            return operators.desc(fields.id);
          },
          with: {
            event: {
              columns: {
                eventType: true,
              },
            },
          },
        });

        const hasMoreResultsThanLimit = results.length > limit;

        let hasNextPage = false;
        let hasPreviousPage = false;
        let pageResults = results.slice(0, limit);

        if (before) {
          pageResults = pageResults.toReversed();
          hasPreviousPage = hasMoreResultsThanLimit;
          hasNextPage = !!previousDeliveries;
        } else {
          hasNextPage = hasMoreResultsThanLimit;
          hasPreviousPage = !!previousDeliveries;
        }

        const startCursor = pageResults[0];
        const endCursor = pageResults[pageResults.length - 1];

        return c.json(
          formatResponseUsingZodSchema(AppWebhookDeliveriesGetResponseSchema, {
            results: pageResults.map((item) => ({
              cursor: item,
              item,
            })),
            pageInfo: {
              hasNextPage,
              hasPreviousPage,
              startCursor,
              endCursor,
            },
          }),
          200,
        );
      } catch (error) {
        if (error instanceof AppManagerAppNotFoundError) {
          return c.json({ message: "App not found" }, 404);
        }

        if (error instanceof AppWebhookManagerAppWebhookNotFoundError) {
          return c.json({ message: "Webhook not found" }, 404);
        }

        throw error;
      }
    },
  );
}
