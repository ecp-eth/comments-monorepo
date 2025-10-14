import { z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  NotificationTypeSchema,
  type NotificationTypeSchemaType,
} from "../../../notifications/schemas.ts";
import {
  APIErrorResponseSchema,
  OpenAPIBigintStringSchema,
  OpenAPIENSNameOrAddressSchema,
} from "../../../lib/schemas.ts";
import { db, appKeyMiddleware } from "../../../services/index.ts";
import { AppManagerAppNotFoundError } from "../../../services/app-manager-service.ts";
import type { Hex } from "@ecp.eth/sdk/core";
import { schema } from "../../../../schema.ts";
import { resolveUsersByAddressOrEnsName } from "../../../lib/utils";
import { ensByNameResolverService } from "../../../services/ens-by-name-resolver.ts";
import {
  createUserDataAndFormatSingleCommentResponseResolver,
  formatResponseUsingZodSchema,
} from "../../../lib/response-formatters.ts";
import {
  AppNotificationGetRequestQueryAppSchema,
  AppNotificationGetRequestQuerySeenSchema,
  AppNotificationGetRequestQueryTypeSchema,
} from "../schemas.ts";
import { AppNotificationsCursorOutputSchema } from "../get.ts";
import type { SnakeCasedProperties } from "type-fest";
import type { NotificationOutboxSelectType } from "../../../../schema.offchain.ts";
import type { JSONCommentSelectType } from "../types.ts";
import { IndexerAPICommentOutputSchema } from "@ecp.eth/sdk/indexer";
import { ensByAddressResolverService } from "../../../services/ens-by-address-resolver.ts";
import { farcasterByAddressResolverService } from "../../../services/farcaster-by-address-resolver.ts";
import { convertJsonCommentToCommentSelectType } from "../utils.ts";

export const AppNotificationsGroupedCursorInputSchema = z
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
      us: z.coerce.bigint(),
      notificationType: NotificationTypeSchema,
      parentId: z.string().nonempty(),
    }),
  )
  .openapi({
    description: "The cursor to the notification group",
  });

export const AppNotificationsGroupedCursorOutputSchema = z
  .object({
    us: OpenAPIBigintStringSchema,
    notificationType: NotificationTypeSchema,
    parentId: z.string().nonempty(),
  })
  .transform((val) => Buffer.from(JSON.stringify(val)).toString("base64url"));

export const AppNotificationsGroupedGetRequestQuerySchema = z
  .object({
    app: AppNotificationGetRequestQueryAppSchema,
    before: AppNotificationsGroupedCursorInputSchema.optional().openapi({
      description: "Fetch newer notifications than the cursor",
    }),
    after: AppNotificationsGroupedCursorInputSchema.optional().openapi({
      description: "Fetch older notifications than the cursor",
    }),
    limit: z.coerce.number().int().min(1).max(100).default(10).openapi({
      description: "The number of notifications to return",
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

export const AppNotificationsGroupedGetResponseSchema = z.object({
  notifications: z.array(
    z.object({
      cursor: AppNotificationsGroupedCursorOutputSchema,
      groupedBy: z
        .object({
          notificationType: NotificationTypeSchema,
          parent: z.object({
            type: z.literal("comment"),
            comment: IndexerAPICommentOutputSchema,
          }),
        })
        .openapi({
          description: "Condition used to group notifications",
        }),
      notifications: z.object({
        notifications: z.array(z.any()),
        pageInfo: z.object({
          hasNextPage: z.boolean().openapi({
            description: "Whether there are older notifications",
          }),
          hasPreviousPage: z.boolean().openapi({
            description: "Whether there are newer notifications",
          }),
          startCursor: AppNotificationsCursorOutputSchema.optional().openapi({
            description: "The cursor to the first notification",
          }),
          endCursor: AppNotificationsCursorOutputSchema.optional().openapi({
            description: "The cursor to the last notification",
          }),
        }),
        extra: z.object({
          unseenCount: OpenAPIBigintStringSchema.openapi({
            description: "The number of unseen notification groups",
          }),
        }),
      }),
    }),
  ),
  pageInfo: z.object({
    hasNextPage: z.boolean().openapi({
      description: "Whether there are older notifications",
    }),
    hasPreviousPage: z.boolean().openapi({
      description: "Whether there are newer notifications",
    }),
    startCursor: AppNotificationsGroupedCursorOutputSchema.optional().openapi({
      description: "The cursor to the first notification",
    }),
    endCursor: AppNotificationsGroupedCursorOutputSchema.optional().openapi({
      description: "The cursor to the last notification",
    }),
  }),
  extra: z.object({
    unseenCount: OpenAPIBigintStringSchema.openapi({
      description: "The number of unseen notification groups",
    }),
  }),
});

export function setupAppNotificationsGroupedGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/notifications/grouped",
      middleware: appKeyMiddleware,
      description: "Get notifications grouped by type",
      request: {
        query: AppNotificationsGroupedGetRequestQuerySchema,
      },
      responses: {
        200: {
          description: "The notifications grouped by type",
          content: {
            "application/json": {
              schema: AppNotificationsGroupedGetResponseSchema,
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
          description: "App not found",
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
        seen,
        type: types,
        user,
      } = c.req.valid("query");

      try {
        const app = c.get("app");
        const groupedNotificationsLimit = 5;
        const sharedConditions: (SQL | undefined)[] = [
          eq(schema.appNotification.appId, app.id),
        ];
        const pageConditions: (SQL | undefined)[] = [];
        const orderBy: SQL[] = [];
        const resolvedUsers: Hex[] = await resolveUsersByAddressOrEnsName(
          [user],
          ensByNameResolverService,
        );

        if (resolvedUsers.length === 0) {
          return c.json({ message: "Invalid ENS name" }, 400);
        }

        sharedConditions.push(
          inArray(
            sql`${schema.appNotification.recipientAddress}`,
            resolvedUsers.map((user) => user.toLowerCase()),
          ),
        );

        if (seen != null) {
          if (seen) {
            pageConditions.push(isNotNull(schema.appNotification.seenAt));
          } else {
            pageConditions.push(isNull(schema.appNotification.seenAt));
          }
        }

        if (apps.length > 0) {
          sharedConditions.push(
            inArray(
              sql`${schema.appNotification.appSigner}`,
              apps.map((app) => app.toLowerCase()),
            ),
          );
        }

        if (types.length > 0) {
          sharedConditions.push(
            inArray(schema.appNotification.notificationType, types),
          );
        }

        if (after) {
          pageConditions.push(
            or(
              sql`created_at < to_timestamp(${after.us} / 1e6)::timestamptz`,
              and(
                sql`created_at = to_timestamp(${after.us} / 1e6)::timestamptz`,
                or(
                  sql`notification_type > ${after.notificationType}`,
                  and(
                    sql`notification_type = ${after.notificationType}`,
                    sql`parent_id < to_timestamp(${after.us} / 1e6)::timestamptz`,
                  ),
                ),
              ),
            ),
          );
          orderBy.push(
            desc(sql`created_at`),
            asc(sql`notification_type`),
            asc(sql`parent_id`),
          );
        } else if (before) {
          pageConditions.push(
            or(
              sql`created_at > to_timestamp(${before.us} / 1e6)::timestamptz`,
              and(
                sql`created_at = to_timestamp(${before.us} / 1e6)::timestamptz`,
                or(
                  sql`notification_type < ${before.notificationType}`,
                  and(
                    sql`notification_type = ${before.notificationType}`,
                    sql`parent_id > to_timestamp(${before.us} / 1e6)::timestamptz`,
                  ),
                ),
              ),
            ),
          );
          orderBy.push(
            desc(sql`created_at`),
            desc(sql`notification_type`),
            desc(sql`parent_id`),
          );
        } else {
          orderBy.push(
            desc(sql`created_at`),
            asc(sql`notification_type`),
            asc(sql`parent_id`),
          );
        }

        const { rows } = await db.execute<{
          notification_type: NotificationTypeSchemaType;
          parent_id: string;
          /**
           * Bigint created_at in microseconds since epoch as string
           */
          us: string;
          /**
           * Bigint as string
           */
          group_unseen_count: string;
          comment: JSONCommentSelectType;
          app_notification: {
            id: string;
            us: string;
          };
          notification: JSONNotificationOutboxSelectType;
          /**
           * Bigint as string
           */
          total_unseen_count: string;
          newest_group: {
            notification_type: NotificationTypeSchemaType;
            parent_id: string;
            us: string | number;
          } | null;
          oldest_group: {
            notification_type: NotificationTypeSchemaType;
            parent_id: string;
            us: string | number;
          } | null;
        }>(
          sql`
            WITH 
              newest_group AS (
                SELECT 
                  notification_type, 
                  parent_id, 
                  (extract(epoch from created_at) * 1e6)::bigint as us -- epoch in microseconds
                FROM ${schema.appNotification}
                WHERE ${and(...sharedConditions)}
                ORDER BY created_at DESC, notification_type ASC, parent_id ASC
                LIMIT 1
              ),
              oldest_group AS (
                SELECT 
                  notification_type, 
                  parent_id, 
                  (extract(epoch from created_at) * 1e6)::bigint as us -- epoch in microseconds
                FROM ${schema.appNotification}
                WHERE ${and(...sharedConditions)}
                ORDER BY created_at ASC, notification_type DESC, parent_id DESC
                LIMIT 1
              ),
              groups AS (
                SELECT 
                  COUNT(*) as group_unseen_count,
                  ${schema.appNotification.notificationType},
                  ${schema.appNotification.parentId}, 
                  MAX(${schema.appNotification.createdAt}) as created_at
                FROM ${schema.appNotification}
                WHERE ${and(...sharedConditions, ...pageConditions)}
                GROUP BY ${schema.appNotification.notificationType}, ${schema.appNotification.parentId}
                ORDER BY ${sql.join(orderBy, sql`, `)}
                LIMIT ${limit}
              ),
              total_unseen_groups_count AS (
                SELECT COUNT(*) as total_unseen_count FROM (
                  SELECT 
                    DISTINCT notification_type, parent_id
                  FROM ${schema.appNotification}
                  WHERE ${and(...sharedConditions)}
                )
              )
            
            SELECT 
              g.notification_type,
              g.parent_id,
              (extract(epoch from g.created_at) * 1e6)::bigint as us, -- epoch in microseconds
              g.group_unseen_count,
              to_jsonb(t) AS "app_notification",
              to_jsonb(n) AS "notification",
              (SELECT total_unseen_count FROM total_unseen_groups_count) as total_unseen_count,
              to_jsonb(ng) AS "newest_group",
              to_jsonb(og) AS "oldest_group",
              to_jsonb(c) AS "comment"
            FROM groups g
            JOIN ${schema.comment} c ON (c.id = g.parent_id)
            JOIN LATERAL (SELECT * FROM newest_group) ng ON (true)
            JOIN LATERAL (SELECT * FROM oldest_group) og ON (true)
            JOIN LATERAL (
              SELECT
                ${schema.appNotification.id},
                (extract(epoch from ${schema.appNotification.createdAt}) * 1e6)::bigint as us, -- epoch in microseconds
                ${schema.appNotification.notificationId}
              FROM ${schema.appNotification}
              WHERE 
                ${and(
                  eq(schema.appNotification.appId, app.id),
                  inArray(
                    schema.appNotification.recipientAddress,
                    resolvedUsers.map((user) => user.toLowerCase() as Hex),
                  ),
                  apps.length > 0
                    ? inArray(
                        schema.appNotification.appSigner,
                        apps.map((app) => app.toLowerCase() as Hex),
                      )
                    : undefined,
                  eq(
                    schema.appNotification.notificationType,
                    sql`g.notification_type`,
                  ),
                  eq(schema.appNotification.parentId, sql`g.parent_id`),
                  seen === true
                    ? isNotNull(schema.appNotification.seenAt)
                    : undefined,
                  seen === false
                    ? isNull(schema.appNotification.seenAt)
                    : undefined,
                )}
              ORDER BY ${schema.appNotification.createdAt} DESC
              LIMIT ${groupedNotificationsLimit + 1} -- +1 to if the are more notification (next page)
            ) t ON true
            JOIN ${schema.notificationOutbox} n ON (t.notification_id = n.id)
            ORDER BY us DESC, notification_type ASC, parent_id ASC
            `,
        );

        type Group = {
          us: string;
          notificationType: NotificationTypeSchemaType;
          parentId: string;
          comment: JSONCommentSelectType;
          newestGroup: {
            notification_type: NotificationTypeSchemaType;
            parent_id: string;
            us: string | number;
          } | null;
          oldestGroup: {
            notification_type: NotificationTypeSchemaType;
            parent_id: string;
            us: string | number;
          } | null;
          notifications: {
            notifications: Record<string, any>[];
            pageInfo: {
              hasNextPage: boolean;
              hasPreviousPage: boolean;
              startCursor:
                | z.input<typeof AppNotificationsCursorOutputSchema>
                | undefined;
              endCursor:
                | z.input<typeof AppNotificationsCursorOutputSchema>
                | undefined;
            };
            extra: {
              unseenCount: string;
            };
          };
        };

        const userAddresses = new Set<Hex>();
        const groups: Group[] = [];
        let currentGroup: Group | null = null;

        for (const row of rows) {
          userAddresses.add(row.comment.author);

          if (
            !currentGroup ||
            currentGroup.us !== row.us ||
            currentGroup.notificationType !== row.notification_type ||
            currentGroup.parentId !== row.parent_id
          ) {
            if (currentGroup) {
              groups.push(currentGroup);
            }

            currentGroup = {
              us: row.us,
              notificationType: row.notification_type,
              parentId: row.parent_id,
              comment: row.comment,
              newestGroup: row.newest_group,
              oldestGroup: row.oldest_group,
              notifications: {
                notifications: [],
                pageInfo: {
                  hasNextPage: false,
                  hasPreviousPage: false,
                  startCursor: undefined,
                  endCursor: undefined,
                },
                extra: {
                  unseenCount: row.group_unseen_count,
                },
              },
            };
          }

          const cursor: z.input<typeof AppNotificationsCursorOutputSchema> = {
            id: row.app_notification.id,
            us: row.app_notification.us,
          };

          if (
            currentGroup.notifications.notifications.length <
            groupedNotificationsLimit
          ) {
            currentGroup.notifications.notifications.push(row.notification);
          } else {
            currentGroup.notifications.pageInfo.hasNextPage = true;
          }

          if (!currentGroup.notifications.pageInfo.startCursor) {
            currentGroup.notifications.pageInfo.startCursor = cursor;
          }

          currentGroup.notifications.pageInfo.endCursor = cursor;
        }

        if (currentGroup) {
          groups.push(currentGroup);
        }

        const [resolvedUsersEnsData, resolvedUsersFarcasterData] =
          await Promise.all([
            ensByAddressResolverService.loadMany([...userAddresses]),
            farcasterByAddressResolverService.loadMany([...userAddresses]),
          ]);

        const resolveUserDataAndFormatSingleCommentResponse =
          createUserDataAndFormatSingleCommentResponseResolver(
            0,
            resolvedUsersEnsData,
            resolvedUsersFarcasterData,
          );

        const firstGroup = groups[0];
        const lastGroup = groups[groups.length - 1];
        const hasNextPage =
          lastGroup && lastGroup.oldestGroup
            ? BigInt(lastGroup.oldestGroup.us) !== BigInt(lastGroup.us) ||
              lastGroup.oldestGroup.notification_type !==
                lastGroup.notificationType ||
              lastGroup.oldestGroup.parent_id !== lastGroup.parentId
            : false;
        const hasPreviousPage =
          firstGroup && firstGroup.newestGroup
            ? BigInt(firstGroup.newestGroup.us) !== BigInt(firstGroup.us) ||
              firstGroup.newestGroup.notification_type !==
                firstGroup.notificationType ||
              firstGroup.newestGroup.parent_id !== firstGroup.parentId
            : false;

        return c.json(
          formatResponseUsingZodSchema(
            AppNotificationsGroupedGetResponseSchema,
            {
              notifications: groups.map((group) => {
                return {
                  cursor: group,
                  groupedBy: {
                    notificationType: group.notificationType,
                    parent: {
                      type: "comment" as const,
                      comment: resolveUserDataAndFormatSingleCommentResponse(
                        convertJsonCommentToCommentSelectType(group.comment),
                      ),
                    },
                  },
                  notifications: group.notifications,
                };
              }),
              pageInfo: {
                hasPreviousPage,
                hasNextPage,
                startCursor: groups[0],
                endCursor: groups[groups.length - 1],
              },
              extra: {
                unseenCount: rows[0]?.total_unseen_count ?? "0",
              },
            },
          ),
          200,
        );
      } catch (error) {
        if (error instanceof AppManagerAppNotFoundError) {
          return c.json({ message: "App not found" }, 404);
        }

        throw error;
      }
    },
  );
}

type JSONNotificationOutboxSelectType = SnakeCasedProperties<{
  [K in keyof NotificationOutboxSelectType]: NotificationOutboxSelectType[K] extends Date
    ? string
    : NotificationOutboxSelectType[K] extends Date | null
      ? string | null
      : NotificationOutboxSelectType[K] extends bigint
        ? string | number
        : NotificationOutboxSelectType[K];
}>;
