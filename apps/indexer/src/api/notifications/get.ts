import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { appKeyMiddleware, db } from "../../services/index.ts";
import {
  APIErrorResponseSchema,
  OpenAPIBigintStringSchema,
  OpenAPIENSNameOrAddressSchema,
  OpenAPIHexSchema,
} from "../../lib/schemas.ts";
import { type NotificationTypeSchemaType } from "../../notifications/schemas.ts";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  sql,
  type SQL,
} from "drizzle-orm";
import { schema } from "../../../schema.ts";
import { resolveUsersByAddressOrEnsName } from "../../lib/utils.ts";
import { ensByNameResolverService } from "../../services/ens-by-name-resolver.ts";
import type { Hex } from "@ecp.eth/sdk/core";
import {
  createUserDataAndFormatSingleCommentResponseResolver,
  formatAuthor,
  formatResponseUsingZodSchema,
  mapReplyCountsByCommentId,
  resolveUserData,
} from "../../lib/response-formatters.ts";
import {
  AppNotificationGetRequestQueryAppSchema,
  AppNotificationGetRequestQuerySeenSchema,
  AppNotificationGetRequestQueryTypeSchema,
  AppNotificationOutputSchema,
} from "./schemas.ts";
import { ensByAddressResolverService } from "../../services/ens-by-address-resolver.ts";
import { farcasterByAddressResolverService } from "../../services/farcaster-by-address-resolver.ts";
import type { JSONCommentSelectType } from "./types.ts";
import { convertJsonCommentToCommentSelectType } from "./utils.ts";
import { COMMENT_TYPE_COMMENT } from "@ecp.eth/sdk";

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
    }),
  )
  .openapi({
    description: "The cursor to the notification",
  });

export const AppNotificationsCursorOutputSchema = z
  .object({
    id: OpenAPIBigintStringSchema,
  })
  .transform((val) => {
    return Buffer.from(JSON.stringify(val)).toString("base64url");
  });

export const AppNotificationsGetRequestQuerySchema = z
  .object({
    app: AppNotificationGetRequestQueryAppSchema,
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
    type: AppNotificationGetRequestQueryTypeSchema,
    user: OpenAPIENSNameOrAddressSchema,
    seen: AppNotificationGetRequestQuerySeenSchema,
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
      notification: AppNotificationOutputSchema,
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
          content: {
            "application/json": {
              schema: AppNotificationsGetResponseSchema,
            },
          },
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
        user,
        seen,
      } = c.req.valid("query");
      const app = c.get("app");

      const [resolvedUser] = await resolveUsersByAddressOrEnsName(
        [user],
        ensByNameResolverService,
      );

      if (!resolvedUser) {
        return c.json({ message: "Invalid ENS name" }, 400);
      }

      /**
       * Conditions used for all queries
       */
      const sharedConditions: (SQL | undefined)[] = [
        eq(schema.appNotification.appId, app.id),
        eq(
          schema.appNotification.recipientAddress,
          resolvedUser.toLowerCase() as Hex,
        ),
        parentId ? eq(schema.appNotification.parentId, parentId) : undefined,
        types.length > 0
          ? inArray(schema.appNotification.notificationType, types)
          : undefined,
        apps.length > 0
          ? inArray(
              schema.appNotification.appSigner,
              apps.map((app) => app.toLowerCase() as Hex),
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
        pageConditions.push(lt(schema.appNotification.id, after.id));
        orderBy.push(desc(schema.appNotification.id));
      } else if (before) {
        pageConditions.push(gt(schema.appNotification.id, before.id));
        orderBy.push(asc(schema.appNotification.id));
      } else {
        orderBy.push(desc(schema.appNotification.id));
      }

      const { rows } = await db.execute<{
        id: string;
        createdAt: Date;
        notificationType: NotificationTypeSchemaType;
        seenAt: Date | null;
        appSigner: Hex;
        /**
         * The comment that triggered the notification
         */
        comment: JSONCommentSelectType;
        /**
         * The parent of the comment that triggered the notification
         */
        parent: JSONCommentSelectType;
        recipientAddress: Hex;
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
            ORDER BY ${schema.appNotification.id} DESC
            LIMIT 1
          ),
          oldest_notification AS (
            SELECT id FROM ${schema.appNotification}
            WHERE ${and(...cursorConditions)}
            ORDER BY ${schema.appNotification.id} ASC
            LIMIT 1
          )
        
        SELECT 
          t.*,
          to_jsonb(c) as comment,
          to_jsonb(p) as parent
        FROM (
          SELECT 
            ${schema.appNotification.id},
            ${schema.appNotification.createdAt} as "createdAt",
            ${schema.appNotification.notificationType} as "notificationType",
            ${schema.appNotification.seenAt} as "seenAt",
            ${schema.appNotification.appSigner} as "appSigner",
            ${schema.appNotification.recipientAddress} as "recipientAddress",
            ${schema.appNotification.parentId} as "parentId",
            ${schema.appNotification.entityId} as "entityId",
            (SELECT "count" FROM unseen_count) as "unseenCount",
            (SELECT id FROM newest_notification) as "newestNotificationId",
            (SELECT id FROM oldest_notification) as "oldestNotificationId"
          FROM ${schema.appNotification}
          WHERE ${and(...pageConditions)}
          ORDER BY ${sql.join(orderBy, sql`, `)}
          LIMIT ${limit}
        ) t
        JOIN ${schema.comment} c ON (c.id = t."entityId")
        JOIN ${schema.comment} p ON (p.id = t."parentId")
        ORDER BY t."id" DESC
      `);

      const startCursor = rows[0];
      const endCursor = rows[rows.length - 1];
      const hasNextPage = endCursor?.id !== endCursor?.oldestNotificationId;
      const hasPreviousPage =
        startCursor?.id !== startCursor?.newestNotificationId;

      const userAddresses = new Set<Hex>(
        [resolvedUser].concat(
          rows.flatMap((row) => {
            return [
              row.comment.author,
              row.parent.author,
              row.recipientAddress,
            ];
          }),
        ),
      );

      const [
        resolvedAuthorsEnsData,
        resolvedAuthorsFarcasterData,
        replyCounts,
      ] = await Promise.all([
        ensByAddressResolverService.loadMany([...userAddresses]),
        farcasterByAddressResolverService.loadMany([...userAddresses]),
        mapReplyCountsByCommentId(
          rows.map((row) => row.comment),
          {
            mode: "nested",
            commentType: COMMENT_TYPE_COMMENT,
          },
        ),
      ]);

      const resolveUserDataAndFormatSingleCommentResponse =
        createUserDataAndFormatSingleCommentResponseResolver({
          replyLimit: 0,
          resolvedAuthorsEnsData,
          resolvedAuthorsFarcasterData,
          replyCounts,
        });

      return c.json(
        formatResponseUsingZodSchema(AppNotificationsGetResponseSchema, {
          notifications: rows.map((row) => {
            const formattedComment =
              resolveUserDataAndFormatSingleCommentResponse(
                convertJsonCommentToCommentSelectType(row.comment),
              );

            switch (row.notificationType) {
              case "reply":
                return {
                  cursor: row,
                  notification: {
                    id: row.id,
                    createdAt: row.createdAt,
                    type: row.notificationType,
                    seen: !!row.seenAt,
                    seenAt: row.seenAt,
                    app: row.appSigner,
                    author: formattedComment.author,
                    comment: formattedComment,
                    replyingTo: resolveUserDataAndFormatSingleCommentResponse(
                      convertJsonCommentToCommentSelectType(row.parent),
                    ),
                  },
                };
              case "mention": {
                const resolvedUserEnsData = resolveUserData(
                  resolvedAuthorsEnsData,
                  row.recipientAddress,
                );
                const resolvedUserFarcasterData = resolveUserData(
                  resolvedAuthorsFarcasterData,
                  row.recipientAddress,
                );

                return {
                  cursor: row,
                  notification: {
                    id: row.id,
                    createdAt: row.createdAt,
                    type: row.notificationType,
                    seen: !!row.seenAt,
                    seenAt: row.seenAt,
                    app: row.appSigner,
                    author: formattedComment.author,
                    comment: formattedComment,
                    mentionedUser: formatAuthor(
                      row.recipientAddress,
                      resolvedUserEnsData,
                      resolvedUserFarcasterData,
                    ),
                  },
                };
              }
              case "reaction":
                return {
                  cursor: row,
                  notification: {
                    id: row.id,
                    createdAt: row.createdAt,
                    type: row.notificationType,
                    seen: !!row.seenAt,
                    seenAt: row.seenAt,
                    app: row.appSigner,
                    author: formattedComment.author,
                    comment: formattedComment,
                    reactingTo: resolveUserDataAndFormatSingleCommentResponse(
                      convertJsonCommentToCommentSelectType(row.parent),
                    ),
                  },
                };
              case "quote":
                return {
                  cursor: row,
                  notification: {
                    id: row.id,
                    createdAt: row.createdAt,
                    type: row.notificationType,
                    seen: !!row.seenAt,
                    seenAt: row.seenAt,
                    app: row.appSigner,
                    author: formattedComment.author,
                    comment: formattedComment,
                    quotedComment:
                      resolveUserDataAndFormatSingleCommentResponse(
                        convertJsonCommentToCommentSelectType(row.parent),
                      ),
                  },
                };
              default:
                row.notificationType satisfies never;
                throw new Error(
                  `Unknown notification type: ${row.notificationType}`,
                );
            }
          }),
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
