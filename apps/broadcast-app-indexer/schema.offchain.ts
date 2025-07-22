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

export const offchainSchema = pgSchema("broadcast_app_indexer_offchain");

export const channelSubscription = offchainSchema.table(
  "channel_subscription",
  {
    channelId: numeric({ scale: 0, precision: 78, mode: "bigint" }).notNull(),
    userFid: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    order: integer().notNull().default(0),
    notificationsEnabled: boolean().notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.channelId, table.userFid] }),
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
    commentId: text().notNull().primaryKey(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    pendingSubscriberFids: integer().array().notNull(),
    status: neynarNotificationServiceQueueStatus().notNull().default("pending"),
    notificationUUID: uuid().notNull().defaultRandom(),
    notification: jsonb().$type<NotificationDetails>().notNull(),
    attempts: integer().notNull().default(0),
  },
  (table) => [
    index("neynar_notification_service_queue_created_at_idx").on(
      table.createdAt,
    ),
    index("neynar_notification_service_queue_status_idx").on(table.status),
  ],
);

export type NeynarNotificationServiceQueueSelectType =
  typeof neynarNotificationServiceQueue.$inferSelect;
