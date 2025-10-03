import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { appKeyMiddleware, db } from "../../services/index.ts";
import {
  APIErrorResponseSchema,
  OpenAPIBigintStringSchema,
  OpenAPIDateStringSchema,
  OpenAPIENSNameOrAddressSchema,
  OpenAPIHexSchema,
} from "../../lib/schemas.ts";
import { NotificationTypeSchema } from "../../notifications/schemas.ts";
import {
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
  SQL,
} from "drizzle-orm";
import { schema } from "../../../schema.ts";
import { resolveUsersByAddressOrEnsName } from "../../lib/utils.ts";
import { ensByNameResolverService } from "../../services/ens-by-name-resolver.ts";
import type { Hex } from "@ecp.eth/sdk/core";
import { formatResponseUsingZodSchema } from "../../lib/response-formatters.ts";

export const AppNotificationsCursorInputSchema = z
  .preprocess(
    (val) => {
      try {
        if (typeof val !== "string") {
          return val;
        }

        return JSON.parse(Buffer.from(val, "base64url").toString("ascii"));
      } catch {
        return val;
      }
    },
    z.object({
      id: z.coerce.bigint(),
      createdAt: z.coerce.date(),
    }),
  )
  .openapi({
    description: "The cursor to the notification",
  });

export const AppNotificationsCursorOutputSchema = z
  .object({
    createdAt: OpenAPIDateStringSchema,
    id: OpenAPIBigintStringSchema,
  })
  .transform((val) => {
    return Buffer.from(JSON.stringify(val)).toString("base64url");
  });

export const AppNotificationsGetRequestQuerySchema = z
  .object({
    app: OpenAPIHexSchema.or(OpenAPIHexSchema.array().min(1).max(20))
      .optional()
      .transform((val) => {
        if (!val) {
          return [];
        }

        if (Array.isArray(val)) {
          return val;
        }

        return [val];
      })
      .openapi({
        description: "Return only notifications created by this app signers",
      }),
    before: AppNotificationsCursorInputSchema.optional().openapi({
      description: "Fetch newer notifications than the cursor",
    }),
    after: AppNotificationsCursorInputSchema.optional().openapi({
      description: "Fetch older notifications than the cursor",
    }),
    limit: z.number().int().min(1).max(100).default(10).openapi({
      description: "The number of notifications to return",
    }),
    parentId: OpenAPIHexSchema.optional().openapi({
      description: "Return only notifications for this parent id",
    }),
    type: NotificationTypeSchema.or(NotificationTypeSchema.array())
      .optional()
      .transform((val) => {
        if (!val) {
          return [];
        }

        if (Array.isArray(val)) {
          return val;
        }

        return [val];
      })
      .openapi({
        description: "Return only notifications of this type",
      }),
    user: OpenAPIENSNameOrAddressSchema.or(
      OpenAPIENSNameOrAddressSchema.array().min(1).max(20),
    )
      .transform((val) => {
        return Array.isArray(val) ? val : [val];
      })
      .openapi({
        description: "The user to fetch notifications for",
      }),
    seen: z
      .enum(["true", "false", "1", "0"])
      .transform((val) => {
        if (val === "true" || val === "1") {
          return true;
        }

        return false;
      })
      .optional()
      .openapi({
        description:
          "Whether to include only seen or unseen notifications, if omitted or empty all notifications will be included",
        enum: ["true", "false", "1", "0"],
      }),
  })
  .superRefine((data, ctx) => {
    if (data.before && data.after) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cannot use both before and after",
      });
    }
  });

export const AppNotificationsGetResponseSchema = z.object({
  notifications: z.array(
    z.object({
      cursor: AppNotificationsCursorOutputSchema,
    }),
  ),
  pageInfo: z.object({
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    startCursor: AppNotificationsCursorOutputSchema.optional(),
    endCursor: AppNotificationsCursorOutputSchema.optional(),
  }),
  extra: z.object({
    unseenCount: OpenAPIBigintStringSchema,
  }),
});

export function setupNotificationsGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/notifications",
      middleware: appKeyMiddleware,
      description: "Get notifications",
      request: {
        query: AppNotificationsGetRequestQuerySchema,
      },
      responses: {
        200: {
          description: "The notifications",
        },
        400: {
          description: "Bad request",
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
      const {
        app: apps,
        before,
        after,
        limit,
        parentId,
        type: types,
        user: users,
        seen,
      } = c.req.valid("query");
      const app = c.get("app");

      const resolvedUsers: Hex[] = await resolveUsersByAddressOrEnsName(
        users,
        ensByNameResolverService,
      );

      if (resolvedUsers.length === 0) {
        return c.json({ message: "Invalid ENS names" }, 400);
      }

      /**
       * Conditions used also for unseen count, newest and oldest notification
       */
      const sharedConditions: SQL[] = [
        eq(schema.appNotification.appId, app.id),
        inArray(
          sql`lower(${schema.appNotification.recipientAddress})`,
          sql.join(
            resolvedUsers.map((user) => sql`lower(${user})`),
            ", ",
          ),
        ),
      ];
      /**
       * Conditions used only for notifications
       */
      const conditions: SQL[] = sharedConditions.slice();
      const orderBy: SQL[] = [];
      let isReverse = false;

      if (parentId) {
        sharedConditions.push(eq(schema.appNotification.parentId, parentId));
      }

      if (seen === true) {
        conditions.push(isNotNull(schema.appNotification.seenAt));
      } else if (seen === false) {
        conditions.push(isNull(schema.appNotification.seenAt));
      }

      if (types.length > 0) {
        sharedConditions.push(
          inArray(schema.appNotification.notificationType, types),
        );
      }

      if (apps.length > 0) {
        sharedConditions.push(
          inArray(
            sql`lower(${schema.appNotification.appSigner})`,
            sql.join(
              apps.map((app) => sql`lower(${app})`),
              ", ",
            ),
          ),
        );
      }

      if (after) {
        conditions.push(
          sql`(${schema.appNotification.createdAt}, ${schema.appNotification.id}) < (${after.createdAt}, ${after.id})`,
        );
        orderBy.push(
          desc(schema.appNotification.createdAt),
          desc(schema.appNotification.id),
        );
      } else if (before) {
        isReverse = true;
        conditions.push(
          sql`(${schema.appNotification.createdAt}, ${schema.appNotification.id}) > (${before.createdAt}, ${before.id})`,
        );
        orderBy.push(
          asc(schema.appNotification.createdAt),
          asc(schema.appNotification.id),
        );
      } else {
        orderBy.push(
          desc(schema.appNotification.createdAt),
          desc(schema.appNotification.id),
        );
      }

      const { rows } = await db.execute<{
        id: string;
        createdAt: Date;
        comment: Record<string, any>;
        unseenCount: string;
        newestNotificationId: string;
        oldestNotificationId: string;
      }>(sql`
        WITH 
          unseen_count AS (
            SELECT COUNT(*) as "count" FROM ${schema.appNotification}
            WHERE ${sql.join(sharedConditions, " AND ")}
            AND ${isNull(schema.appNotification.seenAt)}
          ),
          newest_notification AS (
            SELECT id FROM ${schema.appNotification}
            WHERE ${sql.join(sharedConditions, " AND ")}
            ORDER BY created_at DESC, id DESC
            LIMIT 1
          ),
          oldest_notification AS (
            SELECT id FROM ${schema.appNotification}
            WHERE ${sql.join(sharedConditions, " AND ")}
            ORDER BY created_at ASC, id ASC
            LIMIT 1
          )
        
        SELECT 
          an.id,
          an.created_at as "createdAt",
          to_jsonb(c) AS comment,
          (SELECT "count" FROM unseen_count) as "unseenCount",
          (SELECT id FROM newest_notification) as "newestNotificationId",
          (SELECT id FROM oldest_notification) as "oldestNotificationId"
        FROM ${schema.appNotification} an
        JOIN ${schema.comment} c ON (${schema.appNotification.parentId} = ${schema.comment.id})
        WHERE ${sql.join(conditions, " AND ")}
        ORDER BY ${sql.join(orderBy, ", ")}
        LIMIT ${limit}
      `);

      const results = isReverse ? rows.toReversed() : rows;
      const startCursor = results[0];
      const endCursor = results[results.length - 1];
      const hasNextPage = endCursor?.id !== endCursor?.oldestNotificationId;
      const hasPreviousPage =
        startCursor?.id !== startCursor?.newestNotificationId;

      return c.json(
        formatResponseUsingZodSchema(AppNotificationsGetResponseSchema, {
          notifications: results.map((row) => ({
            cursor: row,
          })),
          pageInfo: {
            hasNextPage,
            hasPreviousPage,
            startCursor,
            endCursor,
          },
          extra: {
            unseenCount: rows[0]?.unseenCount ?? "0",
          },
        }),
        200,
      );
    },
  );
}
