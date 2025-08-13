import {
  integer,
  primaryKey,
  pgSchema,
  timestamp,
  boolean,
  text,
  index,
  jsonb,
  uuid,
  numeric,
} from "drizzle-orm/pg-core";
import type { NotificationDetails } from "./src/services/types";
import type { Hex } from "viem";

export const offchainSchema = pgSchema("broadcast_app_indexer_offchain");

export const authSiweSession = offchainSchema.table("auth_siwe_session", {
  id: uuid().notNull().defaultRandom().primaryKey(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  userId: text().notNull().$type<Hex>(),
});

export const authSiweRefreshToken = offchainSchema.table(
  "auth_siwe_refresh_token",
  {
    id: uuid().notNull().defaultRandom().primaryKey(),
    sessionId: uuid()
      .notNull()
      .references(() => authSiweSession.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    isUsed: boolean().notNull().default(false),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
  },
);

export const channelSubscription = offchainSchema.table(
  "channel_subscription",
  {
    channelId: numeric({ scale: 0, precision: 78, mode: "bigint" }).notNull(),
    appId: text().notNull(),
    userFid: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    order: integer().notNull().default(0),
    notificationsEnabled: boolean().notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.channelId, table.appId, table.userFid] }),
    index("channel_subscription_notifications_enabled_idx").on(
      table.notificationsEnabled,
    ),
  ],
);

export const neynarNotificationServiceQueueStatus = offchainSchema.enum(
  "neynar_notification_service_queue_status",
  ["pending", "processing", "completed", "failed"],
);

export const neynarNotificationServiceQueue = offchainSchema.table(
  "neynar_notification_service_queue",
  {
    commentId: text().notNull(),
    appId: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    pendingSubscriberFids: integer().array().notNull(),
    status: neynarNotificationServiceQueueStatus().notNull().default("pending"),
    notificationUUID: uuid().notNull().defaultRandom(),
    notification: jsonb().$type<NotificationDetails>().notNull(),
    attempts: integer().notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.commentId, table.appId] }),
    index("neynar_notification_service_queue_created_at_idx").on(
      table.createdAt,
    ),
    index("neynar_notification_service_queue_status_idx").on(table.status),
  ],
);

export type NeynarNotificationServiceQueueSelectType =
  typeof neynarNotificationServiceQueue.$inferSelect;
