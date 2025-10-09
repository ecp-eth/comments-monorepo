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
  formatAuthor,
  formatResponseUsingZodSchema,
  resolveUserData,
} from "../../../lib/response-formatters.ts";
import {
  AppNotificationGetRequestQueryAppSchema,
  AppNotificationGetRequestQuerySeenSchema,
  AppNotificationGetRequestQueryTypeSchema,
  AppNotificationOutputSchema,
} from "../schemas.ts";
import { AppNotificationsCursorOutputSchema } from "../get.ts";
import type { SnakeCasedProperties } from "type-fest";
import type { AppNotificationSelectType } from "../../../../schema.offchain.ts";
import type { JSONCommentSelectType } from "../types.ts";
import { IndexerAPICommentOutputSchema } from "@ecp.eth/sdk/indexer";
import { ensByAddressResolverService } from "../../../services/ens-by-address-resolver.ts";
import { farcasterByAddressResolverService } from "../../../services/farcaster-by-address-resolver.ts";
import { convertJsonCommentToCommentSelectType } from "../utils.ts";
import type { ResolvedENSData } from "../../../resolvers/ens.types.ts";
import type { ResolvedFarcasterData } from "../../../resolvers/farcaster.types.ts";

const GROUPED_NOTIFICATIONS_LIMIT = 5;

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
        notifications: z.array(
          z.object({
            cursor: AppNotificationsCursorOutputSchema,
            notification: AppNotificationOutputSchema,
          }),
        ),
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
        const sharedConditions: (SQL | undefined)[] = [
          eq(schema.appNotification.appId, app.id),
        ];
        const pageConditions: (SQL | undefined)[] = [];
        const seenConditions: (SQL | undefined)[] = [];
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
            seenConditions.push(isNotNull(schema.appNotification.seenAt));
          } else {
            seenConditions.push(isNull(schema.appNotification.seenAt));
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
                    sql`parent_id < ${after.parentId}`,
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
                    sql`parent_id > ${before.parentId}`,
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

        const { rows } = await db.execute<DBRow>(
          sql`
            WITH 
              newest_group AS (
                SELECT 
                  notification_type, 
                  parent_id, 
                  (extract(epoch from created_at) * 1e6)::bigint::text as us -- epoch in microseconds
                FROM ${schema.appNotification}
                WHERE ${and(...sharedConditions, ...seenConditions)}
                ORDER BY created_at DESC, notification_type ASC, parent_id ASC
                LIMIT 1
              ),
              oldest_group AS (
                SELECT 
                  notification_type, 
                  parent_id, 
                  (extract(epoch from created_at) * 1e6)::bigint::text as us -- epoch in microseconds
                FROM ${schema.appNotification}
                WHERE ${and(...sharedConditions, ...seenConditions)}
                ORDER BY created_at ASC, notification_type DESC, parent_id DESC
                LIMIT 1
              ),
              per_group_latest AS (
                SELECT 
                  DISTINCT ON (${schema.appNotification.notificationType}, ${schema.appNotification.parentId})
                  ${schema.appNotification.notificationType},
                  ${schema.appNotification.parentId},
                  ${schema.appNotification.createdAt},
                  ${schema.appNotification.id}
                FROM ${schema.appNotification}
                WHERE ${and(...sharedConditions, ...seenConditions)}
                ORDER BY 
                  ${schema.appNotification.notificationType} ASC, 
                  ${schema.appNotification.parentId} ASC, 
                  ${schema.appNotification.createdAt} DESC, 
                  ${schema.appNotification.id} DESC
              ),
              page_groups AS (
                SELECT * FROM per_group_latest pgl
                WHERE ${pageConditions.length > 0 ? and(...pageConditions) : sql`true`}
                ORDER BY pgl.created_at DESC, pgl.notification_type ASC, pgl.parent_id ASC, pgl.id DESC
                LIMIT ${limit}
              ),
              per_group_unseen_counts AS (
                SELECT
                  ${schema.appNotification.notificationType},
                  ${schema.appNotification.parentId},
                  COUNT(*) as group_unseen_count
                FROM ${schema.appNotification}
                JOIN page_groups pg ON (
                  pg.notification_type = ${schema.appNotification.notificationType} AND
                  pg.parent_id = ${schema.appNotification.parentId}
                )
                WHERE ${and(...sharedConditions, isNull(schema.appNotification.seenAt))}
                GROUP BY ${schema.appNotification.notificationType}, ${schema.appNotification.parentId}
              ),
              total_unseen_groups_count AS (
                SELECT COUNT(*) as total_unseen_count FROM (
                  SELECT
                    DISTINCT ON (notification_type, parent_id) notification_type, parent_id
                  FROM ${schema.appNotification}
                  WHERE ${and(...sharedConditions, isNull(schema.appNotification.seenAt))}
                )
              )
            
            SELECT 
              g.notification_type,
              g.parent_id,
              (extract(epoch from g.created_at) * 1e6)::bigint::text as us, -- epoch in microseconds
              pguc.group_unseen_count,
              to_jsonb(t) AS "app_notification",
              (SELECT total_unseen_count FROM total_unseen_groups_count) as total_unseen_count,
              to_jsonb(ng) AS "newest_group",
              to_jsonb(og) AS "oldest_group",
              to_jsonb(p) AS "parent",
              to_jsonb(c) AS "comment"
            FROM page_groups g
            JOIN per_group_unseen_counts pguc ON (pguc.notification_type = g.notification_type AND pguc.parent_id = g.parent_id)
            JOIN ${schema.comment} p ON (p.id = g.parent_id)
            JOIN LATERAL (SELECT * FROM newest_group) ng ON (true)
            JOIN LATERAL (SELECT * FROM oldest_group) og ON (true)
            JOIN LATERAL (
              SELECT
                ${schema.appNotification}.*,
                (extract(epoch from ${schema.appNotification.createdAt}) * 1e6)::bigint::text as us -- epoch in microseconds
              FROM ${schema.appNotification}
              WHERE 
                ${and(
                  ...sharedConditions,
                  ...seenConditions,
                  eq(
                    schema.appNotification.notificationType,
                    sql`g.notification_type`,
                  ),
                  eq(schema.appNotification.parentId, sql`g.parent_id`),
                )}
              ORDER BY ${schema.appNotification.createdAt} DESC, ${schema.appNotification.id} DESC
              LIMIT ${GROUPED_NOTIFICATIONS_LIMIT + 1} -- +1 to if the are more notification (next page)
            ) t ON true
            JOIN ${schema.comment} c ON (c.id = t.entity_id)
            ORDER BY g.created_at DESC, g.notification_type ASC, g.parent_id ASC
            `,
        );

        const { groups, resolvedUsersEnsData, resolvedUsersFarcasterData } =
          await resolveGroupedNotificationsFromRows(rows);

        return c.json(
          formatGroupedNotificationsToResponse(
            groups,
            resolvedUsersEnsData,
            resolvedUsersFarcasterData,
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

type DBRow = {
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
  parent: JSONCommentSelectType;
  comment: JSONCommentSelectType;
  app_notification: JSONAppNotificationSelectType & {
    /**
     * Bigint created_at in microseconds since epoch as string
     */
    us: string;
  };
  /**
   * Bigint as string
   */
  total_unseen_count: string;
  newest_group: {
    notification_type: NotificationTypeSchemaType;
    parent_id: string;
    us: string;
  } | null;
  oldest_group: {
    notification_type: NotificationTypeSchemaType;
    parent_id: string;
    us: string;
  } | null;
};

type Group = {
  /**
   * Bigint created_at in microseconds since epoch as string
   */
  us: string;
  notificationType: NotificationTypeSchemaType;
  parentId: string;
  parent: JSONCommentSelectType;
  totalUnseenCount: string;
  newestGroup: {
    notification_type: NotificationTypeSchemaType;
    parent_id: string;
    us: string;
  } | null;
  oldestGroup: {
    notification_type: NotificationTypeSchemaType;
    parent_id: string;
    us: string;
  } | null;
  notifications: {
    notifications: (JSONAppNotificationSelectType & {
      us: string;
      comment: JSONCommentSelectType;
    })[];
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor:
        | z.input<typeof AppNotificationsCursorOutputSchema>
        | undefined;
      endCursor: z.input<typeof AppNotificationsCursorOutputSchema> | undefined;
    };
    extra: {
      unseenCount: string;
    };
  };
};

type JSONAppNotificationSelectType = SnakeCasedProperties<{
  [K in keyof AppNotificationSelectType]: AppNotificationSelectType[K] extends Date
    ? string
    : AppNotificationSelectType[K] extends Date | null
      ? string | null
      : AppNotificationSelectType[K] extends bigint
        ? string | number | bigint
        : AppNotificationSelectType[K];
}>;

async function resolveGroupedNotificationsFromRows(rows: DBRow[]): Promise<{
  groups: Group[];
  resolvedUsersEnsData: ResolvedENSData[];
  resolvedUsersFarcasterData: ResolvedFarcasterData[];
}> {
  const userAddresses = new Set<Hex>();
  const groups: Group[] = [];
  let currentGroup: Group | null = null;

  for (const row of rows) {
    userAddresses.add(row.parent.author);
    userAddresses.add(row.comment.author);
    userAddresses.add(row.app_notification.recipient_address);

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
        parent: row.parent,
        newestGroup: row.newest_group,
        oldestGroup: row.oldest_group,
        totalUnseenCount: row.total_unseen_count,
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
      id: row.app_notification.id.toString(),
      us: row.app_notification.us,
    };

    if (
      currentGroup.notifications.notifications.length <=
      GROUPED_NOTIFICATIONS_LIMIT
    ) {
      currentGroup.notifications.notifications.push({
        ...row.app_notification,
        comment: row.comment,
      });
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

  const [resolvedUsersEnsData, resolvedUsersFarcasterData] = await Promise.all([
    ensByAddressResolverService.loadMany([...userAddresses]),
    farcasterByAddressResolverService.loadMany([...userAddresses]),
  ]);

  return {
    groups,
    resolvedUsersEnsData: resolvedUsersEnsData.filter(
      (data): data is ResolvedENSData =>
        data != null && !(data instanceof Error),
    ),
    resolvedUsersFarcasterData: resolvedUsersFarcasterData.filter(
      (data): data is ResolvedFarcasterData =>
        data != null && !(data instanceof Error),
    ),
  };
}

function formatGroupedNotificationsToResponse(
  groups: Group[],
  resolvedUsersEnsData: ResolvedENSData[],
  resolvedUsersFarcasterData: ResolvedFarcasterData[],
) {
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

  return formatResponseUsingZodSchema(
    AppNotificationsGroupedGetResponseSchema,
    {
      notifications: groups.map((group) => {
        const formattedParentComment =
          resolveUserDataAndFormatSingleCommentResponse(
            convertJsonCommentToCommentSelectType(group.parent),
          );

        return {
          cursor: group,
          groupedBy: {
            notificationType: group.notificationType,
            parent: {
              type: "comment" as const,
              comment: formattedParentComment,
            },
          },
          notifications: {
            ...group.notifications,
            notifications: group.notifications.notifications.map(
              (notification) => {
                const formattedComment =
                  resolveUserDataAndFormatSingleCommentResponse(
                    convertJsonCommentToCommentSelectType(notification.comment),
                  );
                const cursor = {
                  id: notification.id.toString(),
                  us: notification.us,
                };

                switch (notification.notification_type) {
                  case "mention": {
                    const resolvedUserEnsData = resolveUserData(
                      resolvedUsersEnsData,
                      notification.recipient_address,
                    );
                    const resolvedUserFarcasterData = resolveUserData(
                      resolvedUsersFarcasterData,
                      notification.recipient_address,
                    );

                    return {
                      cursor,
                      notification: {
                        id: notification.id.toString(),
                        type: notification.notification_type,
                        author: formattedComment.author,
                        createdAt: notification.created_at,
                        seen: !!notification.seen_at,
                        seenAt: notification.seen_at,
                        app: notification.app_signer,
                        comment: formattedComment,
                        mentionedUser: formatAuthor(
                          notification.recipient_address,
                          resolvedUserEnsData,
                          resolvedUserFarcasterData,
                        ),
                      },
                    };
                  }
                  case "quote": {
                    return {
                      cursor,
                      notification: {
                        id: notification.id.toString(),
                        type: notification.notification_type,
                        author: formattedComment.author,
                        createdAt: notification.created_at,
                        seen: !!notification.seen_at,
                        seenAt: notification.seen_at,
                        app: notification.app_signer,
                        comment: formattedComment,
                        quotedComment: formattedParentComment,
                      },
                    };
                  }
                  case "reaction": {
                    return {
                      cursor,
                      notification: {
                        id: notification.id.toString(),
                        type: notification.notification_type,
                        author: formattedComment.author,
                        createdAt: notification.created_at,
                        seen: !!notification.seen_at,
                        seenAt: notification.seen_at,
                        app: notification.app_signer,
                        comment: formattedComment,
                        reactingTo: formattedParentComment,
                      },
                    };
                  }
                  case "reply": {
                    return {
                      cursor,
                      notification: {
                        id: notification.id.toString(),
                        type: notification.notification_type,
                        author: formattedComment.author,
                        createdAt: notification.created_at,
                        seen: !!notification.seen_at,
                        seenAt: notification.seen_at,
                        app: notification.app_signer,
                        comment: formattedComment,
                        replyingTo: formattedParentComment,
                      },
                    };
                  }
                  default: {
                    notification.notification_type satisfies never;
                    throw new Error(
                      `Unknown notification type: ${notification.notification_type}`,
                    );
                  }
                }
              },
            ),
          },
        };
      }),
      pageInfo: {
        hasPreviousPage,
        hasNextPage,
        startCursor: groups[0],
        endCursor: groups[groups.length - 1],
      },
      extra: {
        unseenCount: groups[0]?.totalUnseenCount ?? "0",
      },
    },
  );
}
