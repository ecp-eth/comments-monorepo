import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
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
  mapReplyCountsByCommentId,
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
import { COMMENT_TYPE_COMMENT } from "@ecp.eth/sdk";
import type { LowercasedHex } from "../../../services/types.ts";

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
      /**
       * Updated at timestamp in microseconds unix timestamp
       */
      us: z.coerce.bigint(),
      id: z.coerce.bigint(),
    }),
  )
  .openapi({
    description: "The cursor to the notification group",
  });

export const AppNotificationsGroupedCursorOutputSchema = z
  .object({
    /**
     * Updated at timestamp in microseconds unix timestamp
     */
    us: OpenAPIBigintStringSchema,
    id: OpenAPIBigintStringSchema,
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
        const [resolvedUser] = await resolveUsersByAddressOrEnsName(
          [user],
          ensByNameResolverService,
        );

        if (!resolvedUser) {
          return c.json({ message: "Invalid ENS name" }, 400);
        }

        const lowercasedResolvedUser = resolvedUser.toLowerCase() as Hex;
        const lowercasedApps = apps.map((app) => app.toLowerCase() as Hex);

        const { rows } = await db.execute<DBRow>(
          sql`
            WITH
              notification_groups AS (
                SELECT 
                  ${schema.appRecipientNotificationGroups.appId},
                  ${schema.appRecipientNotificationGroups.recipientAddress},
                  ${schema.appRecipientNotificationGroups.updatedAt},
                  ${schema.appRecipientNotificationGroups.notificationType},
                  ${schema.appRecipientNotificationGroups.parentId},
                  ${schema.appRecipientNotificationGroups.appNotificationId} as "id"
                FROM ${schema.appRecipientNotificationGroups}
                WHERE ${and(
                  eq(schema.appRecipientNotificationGroups.appId, app.id),
                  eq(
                    schema.appRecipientNotificationGroups.recipientAddress,
                    lowercasedResolvedUser,
                  ),
                  types.length > 0
                    ? inArray(
                        schema.appRecipientNotificationGroups.notificationType,
                        types,
                      )
                    : undefined,
                  apps.length > 0
                    ? inArray(
                        schema.appRecipientNotificationGroups.appSigner,
                        lowercasedApps,
                      )
                    : undefined,
                  seen === true
                    ? eq(
                        schema.appRecipientNotificationGroups.seenStatus,
                        "seen",
                      )
                    : undefined,
                  seen === false
                    ? eq(
                        schema.appRecipientNotificationGroups.seenStatus,
                        "unseen",
                      )
                    : undefined,
                  before
                    ? sql`
                        (${schema.appRecipientNotificationGroups.updatedAt}, ${schema.appRecipientNotificationGroups.appNotificationId}) > (to_timestamp(${before.us} / 1e6)::timestamptz, ${before.id})
                      `
                    : undefined,
                  after
                    ? sql`
                        (${schema.appRecipientNotificationGroups.updatedAt}, ${schema.appRecipientNotificationGroups.appNotificationId}) < (to_timestamp(${after.us} / 1e6)::timestamptz, ${after.id})
                      `
                    : undefined,
                  sql`
                      -- keep only the latest row per group
                      NOT EXISTS (
                        SELECT 1 FROM ${schema.appRecipientNotificationGroups} g
                        WHERE
                          ${and(
                            eq(
                              sql`g.app_id`,
                              schema.appRecipientNotificationGroups.appId,
                            ),
                            eq(
                              sql`g.recipient_address`,
                              schema.appRecipientNotificationGroups
                                .recipientAddress,
                            ),
                            eq(
                              sql`g.notification_type`,
                              schema.appRecipientNotificationGroups
                                .notificationType,
                            ),
                            eq(
                              sql`g.parent_id`,
                              schema.appRecipientNotificationGroups.parentId,
                            ),
                            seen === true
                              ? eq(sql`g.seen_status`, "seen")
                              : undefined,
                            seen === false
                              ? eq(sql`g.seen_status`, "unseen")
                              : undefined,
                            sql`
                              (g.updated_at, g.app_notification_id) > (${schema.appRecipientNotificationGroups.updatedAt}, ${schema.appRecipientNotificationGroups.appNotificationId})
                            `,
                          )}
                      )
                  `,
                )}
                ORDER BY 
                  ${
                    before
                      ? sql`${schema.appRecipientNotificationGroups.updatedAt} ASC, ${schema.appRecipientNotificationGroups.appNotificationId} ASC`
                      : sql`${schema.appRecipientNotificationGroups.updatedAt} DESC, ${schema.appRecipientNotificationGroups.appNotificationId} DESC`
                  }
                -- +1 to get the next page or previous page depending on the used cursor  
                LIMIT ${limit + 1}
              ),
              previous_group AS (
                SELECT
                  -- convert updated_at to microseconds unix timestamp so we don't lose precision when using it as cursor
                  (extract(epoch from ${schema.appRecipientNotificationGroups.updatedAt}) * 1e6)::bigint::text as "us",
                  ${schema.appRecipientNotificationGroups.notificationType},
                  ${schema.appRecipientNotificationGroups.parentId},
                  ${schema.appRecipientNotificationGroups.appNotificationId}::text as "id"
                FROM ${schema.appRecipientNotificationGroups}
                WHERE ${and(
                  eq(schema.appRecipientNotificationGroups.appId, app.id),
                  eq(
                    schema.appRecipientNotificationGroups.recipientAddress,
                    lowercasedResolvedUser,
                  ),
                  types.length > 0
                    ? inArray(
                        schema.appRecipientNotificationGroups.notificationType,
                        types,
                      )
                    : undefined,
                  apps.length > 0
                    ? inArray(
                        schema.appRecipientNotificationGroups.appSigner,
                        lowercasedApps,
                      )
                    : undefined,
                  seen === true
                    ? eq(
                        schema.appRecipientNotificationGroups.seenStatus,
                        "seen",
                      )
                    : undefined,
                  seen === false
                    ? eq(
                        schema.appRecipientNotificationGroups.seenStatus,
                        "unseen",
                      )
                    : undefined,
                )}
                ORDER BY 
                  ${
                    before
                      ? sql`${schema.appRecipientNotificationGroups.updatedAt} ASC, ${schema.appRecipientNotificationGroups.appNotificationId} ASC`
                      : sql`${schema.appRecipientNotificationGroups.updatedAt} DESC, ${schema.appRecipientNotificationGroups.appNotificationId} DESC`
                  }
                LIMIT 1
              ),
              per_group_unseen_counts AS (
                SELECT
                  an.notification_type,
                  an.parent_id,
                  COUNT(*) as group_unseen_count
                FROM notification_groups ng 
                JOIN ${schema.appNotification} an ON (
                  ${and(
                    sql`ng.app_id = an.app_id`,
                    sql`ng.recipient_address = an.recipient_address`,
                    sql`ng.notification_type = an.notification_type`,
                    sql`ng.parent_id = an.parent_id`,
                    apps.length > 0
                      ? inArray(sql`an.app_signer`, lowercasedApps)
                      : undefined,
                    sql`an.seen_at IS NULL`,
                  )}
                )
                GROUP BY an.notification_type, an.parent_id
              ),
              total_unseen_groups_count AS (
                SELECT COUNT(*) as total_unseen_count FROM (
                  SELECT
                    DISTINCT ON (notification_type, parent_id) notification_type, parent_id
                  FROM ${schema.appRecipientNotificationGroups}
                  WHERE ${and(
                    eq(schema.appRecipientNotificationGroups.appId, app.id),
                    eq(
                      schema.appRecipientNotificationGroups.recipientAddress,
                      lowercasedResolvedUser,
                    ),
                    eq(
                      schema.appRecipientNotificationGroups.seenStatus,
                      "unseen",
                    ),
                    apps.length > 0
                      ? inArray(
                          schema.appRecipientNotificationGroups.appSigner,
                          lowercasedApps,
                        )
                      : undefined,
                  )}
                )
              )
            
            SELECT 
              ng.id,
              -- convert updated_at to microseconds unix timestamp so we don't lose precision when using it as cursor
              (extract(epoch from ng.updated_at) * 1e6)::bigint::text as "us",
              ng.notification_type as "notificationType",
              ng.parent_id as "parentId",
              pguc.group_unseen_count as "groupUnseenCount",
              to_jsonb(t) as "appNotification",
              (SELECT total_unseen_count FROM total_unseen_groups_count) as "totalUnseenGroupsCount",
              to_jsonb(pg) as "previousGroup",
              to_jsonb(p) as "parent",
              to_jsonb(c) as "comment"
            FROM notification_groups ng
            JOIN per_group_unseen_counts pguc ON (pguc.notification_type = ng.notification_type AND pguc.parent_id = ng.parent_id)
            JOIN ${schema.comment} p ON (p.id = ng.parent_id)
            JOIN LATERAL (SELECT * FROM previous_group) pg ON (true)
            JOIN LATERAL (
              SELECT
                ${schema.appNotification}.*
              FROM ${schema.appNotification}
              WHERE 
                ${and(
                  eq(schema.appNotification.appId, app.id),
                  eq(
                    schema.appNotification.recipientAddress,
                    lowercasedResolvedUser,
                  ),
                  eq(
                    schema.appNotification.notificationType,
                    sql`ng.notification_type`,
                  ),
                  eq(schema.appNotification.parentId, sql`ng.parent_id`),
                  apps.length > 0
                    ? inArray(schema.appNotification.appSigner, lowercasedApps)
                    : undefined,
                  seen === true
                    ? isNotNull(schema.appNotification.seenAt)
                    : undefined,
                  seen === false
                    ? isNull(schema.appNotification.seenAt)
                    : undefined,
                )}
              ORDER BY ${schema.appNotification.id} DESC
              LIMIT ${GROUPED_NOTIFICATIONS_LIMIT + 1} -- +1 to if the are more notification (next page)
            ) t ON true
            JOIN ${schema.comment} c ON (c.id = t.entity_id)
            ORDER BY ng.updated_at DESC, ng.id DESC
            `,
        );

        const {
          groups,
          resolvedUsersEnsData,
          resolvedUsersFarcasterData,
          replyCounts,
        } = await resolveGroupedNotificationsFromRows(rows);

        return c.json(
          formatGroupedNotificationsToResponse({
            groups,
            resolvedUsersEnsData,
            resolvedUsersFarcasterData,
            limit,
            isBeforeCursorUsed: !!before,
            replyCounts,
          }),
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

/**
 * Unix timestamp in microseconds as string so we don't lose precision when using it as cursor
 */
type UnixTimestampMicroseconds = string;

type GroupHead = {
  id: string;
  us: UnixTimestampMicroseconds;
};

type DBRow = {
  id: string;
  /**
   * Updated at unix timestamp in microseconds
   */
  us: UnixTimestampMicroseconds;
  notificationType: NotificationTypeSchemaType;
  parentId: string;
  /**
   * Bigint as string
   */
  groupUnseenCount: string;
  parent: JSONCommentSelectType;
  comment: JSONCommentSelectType;
  appNotification: JSONAppNotificationSelectType;
  /**
   * Bigint as string
   */
  totalUnseenGroupsCount: string;
  previousGroup: GroupHead | null;
};

type Group = {
  id: string;
  us: UnixTimestampMicroseconds;
  notificationType: NotificationTypeSchemaType;
  parentId: string;
  parent: JSONCommentSelectType;
  totalUnseenGroupsCount: string;
  previousGroup: GroupHead | null;
  notifications: {
    notifications: (JSONAppNotificationSelectType & {
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
  replyCounts: Record<LowercasedHex, number>;
}> {
  const userAddresses = new Set<Hex>();
  const groups: Group[] = [];
  let currentGroup: Group | null = null;

  for (const row of rows) {
    userAddresses.add(row.parent.author);
    userAddresses.add(row.comment.author);
    userAddresses.add(row.appNotification.recipient_address);

    if (
      !currentGroup ||
      currentGroup.id !== row.id ||
      currentGroup.notificationType !== row.notificationType ||
      currentGroup.parentId !== row.parentId
    ) {
      if (currentGroup) {
        groups.push(currentGroup);
      }

      currentGroup = {
        id: row.id,
        us: row.us,
        notificationType: row.notificationType,
        parentId: row.parentId,
        parent: row.parent,
        previousGroup: row.previousGroup,
        totalUnseenGroupsCount: row.totalUnseenGroupsCount,
        notifications: {
          notifications: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: undefined,
            endCursor: undefined,
          },
          extra: {
            unseenCount: row.groupUnseenCount,
          },
        },
      };
    }

    const cursor: z.input<typeof AppNotificationsCursorOutputSchema> = {
      id: row.appNotification.id.toString(),
    };

    if (
      currentGroup.notifications.notifications.length <
      GROUPED_NOTIFICATIONS_LIMIT
    ) {
      currentGroup.notifications.notifications.push({
        ...row.appNotification,
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

  const [resolvedUsersEnsData, resolvedUsersFarcasterData, replyCounts] =
    await Promise.all([
      ensByAddressResolverService.loadMany([...userAddresses]),
      farcasterByAddressResolverService.loadMany([...userAddresses]),
      mapReplyCountsByCommentId(
        rows.map((row) => row.parent),
        {
          mode: "nested",
          commentType: COMMENT_TYPE_COMMENT,
        },
      ),
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
    replyCounts,
  };
}

function formatGroupedNotificationsToResponse({
  groups,
  resolvedUsersEnsData,
  resolvedUsersFarcasterData,
  limit,
  isBeforeCursorUsed,
  replyCounts,
}: {
  groups: Group[];
  resolvedUsersEnsData: ResolvedENSData[];
  resolvedUsersFarcasterData: ResolvedFarcasterData[];
  replyCounts: Record<LowercasedHex, number>;
  limit: number;
  isBeforeCursorUsed: boolean;
}) {
  const resolveUserDataAndFormatSingleCommentResponse =
    createUserDataAndFormatSingleCommentResponseResolver({
      replyLimit: 0,
      resolvedAuthorsEnsData: resolvedUsersEnsData,
      resolvedAuthorsFarcasterData: resolvedUsersFarcasterData,
      replyCounts,
    });

  let hasNextPage = false;
  let hasPreviousPage = false;

  if (isBeforeCursorUsed) {
    hasNextPage =
      groups[0]?.us !== groups[0]?.previousGroup?.us ||
      groups[0]?.id !== groups[0]?.previousGroup?.id;

    if (groups.length > limit) {
      groups.shift();
      hasPreviousPage = true;
    }
  } else {
    hasPreviousPage =
      groups[0]?.us !== groups[0]?.previousGroup?.us ||
      groups[0]?.id !== groups[0]?.previousGroup?.id;

    if (groups.length > limit) {
      groups.pop();
      hasNextPage = true;
    }
  }

  const firstGroup = groups[0];
  const lastGroup = groups[groups.length - 1];

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
        startCursor: firstGroup,
        endCursor: lastGroup,
      },
      extra: {
        unseenCount: groups[0]?.totalUnseenGroupsCount ?? "0",
      },
    },
  );
}
