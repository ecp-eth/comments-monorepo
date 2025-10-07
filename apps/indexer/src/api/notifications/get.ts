import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { appKeyMiddleware, db } from "../../services/index.ts";
import {
  APIErrorResponseSchema,
  OpenAPIBigintStringSchema,
  OpenAPIENSNameOrAddressSchema,
  OpenAPIHexSchema,
} from "../../lib/schemas.ts";
import { NotificationTypeSchema } from "../../notifications/schemas.ts";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
  type SQL,
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
      us: z.coerce.bigint(),
    }),
  )
  .openapi({
    description: "The cursor to the notification",
  });

export const AppNotificationsCursorOutputSchema = z
  .object({
    us: OpenAPIBigintStringSchema,
    id: OpenAPIBigintStringSchema,
  })
  .transform((val) => {
    return Buffer.from(JSON.stringify(val)).toString("base64url");
  });

export const AppNotificationsGetRequestQuerySchema = z
  .object({
    app: z
      .preprocess((val) => {
        if (typeof val === "string") {
          return val.split(",").map((app) => app.trim());
        }

        return val;
      }, OpenAPIHexSchema.array().max(20))
      .default([])
      .openapi({
        description: "Return only notifications created by this app signers",
        oneOf: [
          {
            type: "array",
            items: {
              type: "string",
              description: "an array of app signer public keys in hex format",
            },
          },
          {
            type: "string",
            description:
              "Comma separated list of app signer public keys in hex format",
          },
          {
            type: "string",
            description: "An app signer public key in hex format",
          },
        ],
      }),
    before: AppNotificationsCursorInputSchema.optional().openapi({
      description: "Fetch newer notifications than the cursor",
    }),
    after: AppNotificationsCursorInputSchema.optional().openapi({
      description: "Fetch older notifications than the cursor",
    }),
    limit: z.coerce.number().int().min(1).max(100).default(10).openapi({
      description: "The number of notifications to return",
    }),
    parentId: OpenAPIHexSchema.optional().openapi({
      description: "Return only notifications for this parent id",
    }),
    type: z
      .preprocess((val) => {
        if (typeof val === "string") {
          return val.split(",").map((type) => type.trim());
        }

        return val;
      }, NotificationTypeSchema.array())
      .default([])
      .openapi({
        description: "Return only notifications of this type",
        oneOf: [
          {
            type: "array",
            items: {
              type: "string",
              enum: NotificationTypeSchema.options,
            },
          },
          {
            type: "string",
            enum: NotificationTypeSchema.options,
          },
          {
            type: "string",
            description: "Comma separated list of notification types",
            example: "reply,mention,reaction,quote",
          },
        ],
      }),
    user: z
      .preprocess((val) => {
        if (typeof val === "string") {
          return val.split(",").map((user) => user.trim());
        }

        return val;
      }, OpenAPIENSNameOrAddressSchema.array().min(1).max(20))
      .openapi({
        description: "The user to fetch notifications for",
        oneOf: [
          {
            type: "array",
            items: {
              type: "string",
              description: "an array of ETH addresses or ens names",
            },
          },
          {
            type: "string",
            description: "Comma separated list of ETH addresses or ens names",
          },
          {
            type: "string",
            description: "An ETH address or ens name",
          },
        ],
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
       * Conditions used for all queries
       */
      const sharedConditions: (SQL | undefined)[] = [
        eq(schema.appNotification.appId, app.id),
        inArray(
          sql`lower(${schema.appNotification.recipientAddress})`,
          resolvedUsers.map((user) => sql`lower(${user})`),
        ),
        parentId ? eq(schema.appNotification.parentId, parentId) : undefined,
        types.length > 0
          ? inArray(schema.appNotification.notificationType, types)
          : undefined,
        apps.length > 0
          ? inArray(
              sql`lower(${schema.appNotification.appSigner})`,
              apps.map((app) => sql`lower(${app})`),
            )
          : undefined,
      ];
      /**
       * Conditions used for cursor queries (oldest, newest)
       */
      const cursorConditions: (SQL | undefined)[] = sharedConditions.slice();
      /**
       * Conditions used for page queries (notifications)
       */
      const pageConditions: (SQL | undefined)[] = sharedConditions.slice();
      const orderBy: SQL[] = [];

      if (seen === true) {
        const condition = isNotNull(schema.appNotification.seenAt);
        cursorConditions.push(condition);
        pageConditions.push(condition);
      } else if (seen === false) {
        const condition = isNull(schema.appNotification.seenAt);
        cursorConditions.push(condition);
        pageConditions.push(condition);
      }

      if (after) {
        pageConditions.push(
          sql`(${schema.appNotification.createdAt}, ${schema.appNotification.id}) < (to_timestamp(${after.us} / 1e6)::timestamptz, ${after.id})`,
        );
        orderBy.push(
          desc(schema.appNotification.createdAt),
          desc(schema.appNotification.id),
        );
      } else if (before) {
        pageConditions.push(
          sql`(${schema.appNotification.createdAt}, ${schema.appNotification.id}) > (to_timestamp(${before.us} / 1e6)::timestamptz, ${before.id})`,
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
        /**
         * Bigint created_at in microseconds since epoch as string
         */
        us: string;
        comment: Record<string, any>;
        unseenCount: string;
        newestNotificationId: string;
        oldestNotificationId: string;
      }>(sql`
        WITH 
          unseen_count AS (
            SELECT COUNT(*) as "count" FROM ${schema.appNotification}
            WHERE ${and(...sharedConditions)}
            AND ${isNull(schema.appNotification.seenAt)}
          ),
          newest_notification AS (
            SELECT id FROM ${schema.appNotification}
            WHERE ${and(...cursorConditions)}
            ORDER BY ${schema.appNotification.createdAt} DESC, ${schema.appNotification.id} DESC
            LIMIT 1
          ),
          oldest_notification AS (
            SELECT id FROM ${schema.appNotification}
            WHERE ${and(...cursorConditions)}
            ORDER BY ${schema.appNotification.createdAt} ASC, ${schema.appNotification.id} ASC
            LIMIT 1
          )
        
        SELECT * FROM (
          SELECT 
            ${schema.appNotification.id},
            (extract(epoch from ${schema.appNotification.createdAt}) * 1e6)::bigint as "us", -- epoch in microseconds
            to_jsonb(${schema.comment}.*) AS comment,
            (SELECT "count" FROM unseen_count) as "unseenCount",
            (SELECT id FROM newest_notification) as "newestNotificationId",
            (SELECT id FROM oldest_notification) as "oldestNotificationId"
          FROM ${schema.appNotification}
          JOIN ${schema.comment} ON (${schema.appNotification.entityId} = ${schema.comment.id})
          WHERE ${and(...pageConditions)}
          ORDER BY ${sql.join(orderBy, sql`, `)}
          LIMIT ${limit}
        ) t
        ORDER BY t."us" DESC, t."id" DESC
      `);

      const startCursor = rows[0];
      const endCursor = rows[rows.length - 1];
      const hasNextPage = endCursor?.id !== endCursor?.oldestNotificationId;
      const hasPreviousPage =
        startCursor?.id !== startCursor?.newestNotificationId;

      return c.json(
        formatResponseUsingZodSchema(AppNotificationsGetResponseSchema, {
          notifications: rows.map((row) => ({
            cursor: row,
          })),
          pageInfo: {
            hasNextPage,
            hasPreviousPage,
            startCursor,
            endCursor,
          },
          extra: {
            unseenCount: rows[0]?.unseenCount ?? 0n,
          },
        }),
        200,
      );
    },
  );
}
