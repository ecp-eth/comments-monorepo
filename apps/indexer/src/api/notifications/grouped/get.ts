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
} from "../../../notifications/schemas";
import {
  APIErrorResponseSchema,
  OpenAPIBigintStringSchema,
  OpenAPIHexSchema,
  OpenAPIENSNameOrAddressSchema,
  OpenAPIDateStringSchema,
} from "../../../lib/schemas";
import { appManager, db, siweMiddleware } from "../../../services";
import { AppManagerAppNotFoundError } from "../../../services/app-manager-service";
import type { Hex } from "@ecp.eth/sdk/core";
import { schema } from "../../../../schema";
import { resolveUsersByAddressOrEnsName } from "../../../lib/utils";
import { ensByNameResolverService } from "../../../services/ens-by-name-resolver";
import { formatResponseUsingZodSchema } from "../../../lib/response-formatters";

export const AppNotificationsGroupedGetRequestParamsSchema = z.object({
  appId: z.string().uuid(),
});

export const AppNotificationsGroupedCursorInputSchema = z
  .preprocess(
    (val) => {
      try {
        if (typeof val !== "string") {
          return val;
        }

        const [createdAt, notificationType, parentId] = JSON.parse(
          Buffer.from(val, "base64url").toString("ascii"),
        );

        return {
          createdAt,
          notificationType,
          parentId,
        };
      } catch {
        return val;
      }
    },
    z.object({
      createdAt: z.coerce.date(),
      notificationType: NotificationTypeSchema,
      parentId: z.string().nonempty(),
    }),
  )
  .openapi({
    description: "The cursor to the notification group",
  });

export const AppNotificationsGroupedCursorOutputSchema = z
  .object({
    createdAt: OpenAPIDateStringSchema,
    notificationType: NotificationTypeSchema,
    parentId: z.string().nonempty(),
  })
  .transform((val) =>
    Buffer.from(
      JSON.stringify([val.createdAt, val.notificationType, val.parentId]),
    ).toString("base64url"),
  );

export const AppNotificationsGroupedGetRequestQuerySchema = z
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
    before: AppNotificationsGroupedCursorInputSchema.optional().openapi({
      description: "Fetch newer notifications than the cursor",
    }),
    after: AppNotificationsGroupedCursorInputSchema.optional().openapi({
      description: "Fetch older notifications than the cursor",
    }),
    limit: z.number().int().min(1).max(100).default(10).openapi({
      description: "The number of notifications to return",
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

export const AppNotificationsGroupedGetResponseSchema = z.object({
  notifications: z.array(
    z.object({
      cursor: AppNotificationsGroupedCursorInputSchema,
      groupedBy: z
        .object({
          notificationType: NotificationTypeSchema,
          parent: z.object({
            type: z.literal("comment"),
            comment: z.record(z.any()),
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
          startCursor:
            AppNotificationsGroupedCursorInputSchema.optional().openapi({
              description: "The cursor to the first notification",
            }),
          endCursor:
            AppNotificationsGroupedCursorInputSchema.optional().openapi({
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
    startCursor: AppNotificationsGroupedCursorInputSchema.optional().openapi({
      description: "The cursor to the first notification",
    }),
    endCursor: AppNotificationsGroupedCursorInputSchema.optional().openapi({
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
      path: "/api/apps/{appId}/notifications/grouped",
      middleware: siweMiddleware,
      description: "Get notifications grouped by type",
      request: {
        params: AppNotificationsGroupedGetRequestParamsSchema,
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
      const { appId } = c.req.valid("param");
      const {
        app: apps,
        before,
        after,
        limit,
        seen,
        type: types,
        user: users,
      } = c.req.valid("query");

      try {
        const { app } = await appManager.getApp({
          id: appId,
          ownerId: c.get("user").id,
        });

        const groupedNotificationsLimit = 5;
        const sharedConditions: (SQL | undefined)[] = [
          eq(schema.appNotification.appId, app.id),
        ];
        const pageConditions: (SQL | undefined)[] = sharedConditions.slice();
        const orderBy: SQL[] = [];
        const resolvedUsers: Hex[] = await resolveUsersByAddressOrEnsName(
          users,
          ensByNameResolverService,
        );

        if (resolvedUsers.length === 0) {
          return c.json({ message: "Invalid ENS names" }, 400);
        }

        sharedConditions.push(
          inArray(
            sql`lower(${schema.appNotification.recipientAddress})`,
            sql.join(
              resolvedUsers.map((user) => sql`lower(${user})`),
              ", ",
            ),
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
              sql`lower(${schema.appNotification.appSigner})`,
              sql.join(
                apps.map((app) => sql`lower(${app})`),
                ", ",
              ),
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
              sql`notification_type > ${after.notificationType}`,
              and(
                sql`notification_type = ${after.notificationType}`,
                or(
                  sql`parent_id > ${after.parentId}`,
                  and(
                    sql`parent_id = ${after.parentId}`,
                    sql`created_at < ${after.createdAt}`,
                  ),
                ),
              ),
            ),
            sql`(notification_type, parent_id, created_at) < (${after.notificationType}, ${after.parentId}, ${after.createdAt})`,
          );
          orderBy.push(
            asc(sql`notification_type`),
            asc(sql`parent_id`),
            desc(sql`created_at`),
          );
        } else if (before) {
          pageConditions.push(
            or(
              sql`notification_type < ${before.notificationType}`,
              and(
                sql`notification_type = ${before.notificationType}`,
                or(
                  sql`parent_id < ${before.parentId}`,
                  and(
                    sql`parent_id = ${before.parentId}`,
                    sql`created_at > ${before.createdAt}`,
                  ),
                ),
              ),
            ),
          );
          orderBy.push(
            desc(sql`notification_type`),
            desc(sql`parent_id`),
            desc(sql`created_at`),
          );
        } else {
          orderBy.push(
            asc(sql`notification_type`),
            asc(sql`parent_id`),
            desc(sql`created_at`),
          );
        }

        const { rows } = await db.execute<{
          notification_type: NotificationTypeSchemaType;
          parent_id: string;
          created_at: Date;
          /**
           * Bigint as string
           */
          group_unseen_count: string;
          comment: Record<string, any>;
          notification: Record<string, any>;
          /**
           * Bigint as string
           */
          total_unseen_count: string;
        }>(
          sql`
            WITH 
              newest_group AS (
                SELECT notification_type, parent_id, created_at FROM ${schema.appNotification}
                WHERE ${sql.join(sharedConditions, " AND ")}
                ORDER BY notification_type ASC, parent_id ASC, created_at DESC
                LIMIT 1
              ),
              oldest_group AS (
                SELECT notification_type, parent_id, created_at FROM ${schema.appNotification}
                WHERE ${sql.join(sharedConditions, " AND ")}
                ORDER BY notification_type DESC, parent_id DESC, created_at DESC
                LIMIT 1
              ),
              groups AS (
                SELECT * FROM (
                  SELECT 
                    DISTINCT ON (notification_type, parent_id) 
                    notification_type, 
                    parent_id, 
                    created_at,
                    to_jsonb(${schema.comment}) AS comment
                  FROM ${schema.appNotification}
                  JOIN ${schema.comment} ON (${schema.appNotification.parentId} = ${schema.comment.id})
                  WHERE ${sql.join([...sharedConditions, ...pageConditions], " AND ")}
                  ORDER BY ${sql.join(orderBy, ", ")}
                  LIMIT ${limit}
                ) t 
                ORDER BY t.created_at DESC, t.notification_type ASC, t.parent_id ASC
              ),
              total_unseen_groups_count AS (
                SELECT 
                  COUNT(DISTINCT notification_type, parent_id) as total_unseen_count
                FROM ${schema.appNotification}
                WHERE ${sql.join(sharedConditions, " AND ")}
              )
            
            SELECT 
              g.notification_type,
              g.parent_id,
              g.created_at,
              g.group_unseen_count,
              g.comment,
              to_jsonb(n) AS "notification",
              (SELECT total_unseen_count FROM total_unseen_groups_count) as total_unseen_count,
              to_jsonb(SELECT * FROM newest_group) AS "newest_group",
              to_jsonb(SELECT * FROM oldest_group) AS "oldest_group"
            FROM groups g
            JOIN LATERAL (
              SELECT * FROM ${schema.appNotification}
              WHERE 
                ${and(
                  eq(schema.appNotification.appId, appId),
                  inArray(
                    sql`lower(${schema.appNotification.recipientAddress})`,
                    sql.join(
                      resolvedUsers.map((user) => sql`lower(${user})`),
                      ", ",
                    ),
                  ),
                  apps.length > 0
                    ? inArray(
                        sql`lower(${schema.appNotification.appSigner})`,
                        sql.join(
                          apps.map((app) => sql`lower(${app})`),
                          ", ",
                        ),
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
              ORDER BY created_at DESC
              LIMIT ${groupedNotificationsLimit + 1} -- +1 to if the are more notification (next page)
            ) t ON true
            JOIN ${schema.notificationOutbox} n ON (t.notification_id = n.id)
            `,
        );

        // group notification sorted by created_at by their group_id
        const groupedNotifications = rows.reduce(
          (acc, curr) => {
            const groupId = `${curr.notification_type}:${curr.parent_id}`;

            if (!acc[groupId]) {
              acc[groupId] = {
                createdAt: curr.created_at,
                notificationType: curr.notification_type,
                parentId: curr.parent_id,
                comment: curr.comment,
                notifications: {
                  notifications: [],
                  pageInfo: {
                    hasNextPage: false,
                    hasPreviousPage: false,
                    startCursor: null,
                    endCursor: null,
                  },
                  extra: {
                    unseenCount: curr.group_unseen_count,
                  },
                },
              };
            }

            acc[groupId]!.notifications.notifications.push(curr.notification);

            return acc;
          },
          {} as Record<
            string, // group_id
            {
              createdAt: Date;
              notificationType: NotificationTypeSchemaType;
              parentId: string;
              comment: Record<string, any>;
              notifications: {
                notifications: Record<string, any>[];
                pageInfo: {
                  hasNextPage: boolean;
                  hasPreviousPage: boolean;
                  startCursor: string | null;
                  endCursor: string | null;
                };
                extra: {
                  unseenCount: string;
                };
              };
            }
          >,
        );

        const sortedGroups = Object.values(groupedNotifications)
          .toSorted((a, b) => {
            return b.createdAt.getTime() - a.createdAt.getTime();
          })
          .map((group) => {
            const sortedNotifications =
              group.notifications.notifications.toSorted((a, b) => {
                return b.createdAt.getTime() - a.createdAt.getTime();
              });

            return {
              ...group,
              notifications: {
                ...group.notifications,
                notifications: sortedNotifications.slice(
                  0,
                  groupedNotificationsLimit,
                ),
                pageInfo: {
                  hasNextPage:
                    group.notifications.notifications.length >
                    groupedNotificationsLimit,
                  hasPreviousPage: false,
                  startCursor: sortedNotifications[0],
                  endCursor:
                    sortedNotifications[sortedNotifications.length - 1],
                },
              },
            };
          });

        const hasNextPage = sortedGroups.length > limit;
        const groups = sortedGroups.slice(0, limit);

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
                      comment: group.comment,
                    },
                  },
                  notifications: group.notifications,
                };
              }),
              pageInfo: {
                hasPreviousPage: false,
                hasNextPage,
                startCursor: groups[0],
                endCursor: groups[sortedGroups.length - 1],
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
