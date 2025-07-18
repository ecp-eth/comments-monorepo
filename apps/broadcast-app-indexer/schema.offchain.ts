import {
  integer,
  bigint,
  primaryKey,
  pgSchema,
  timestamp,
  boolean,
  text,
  index,
  pgEnum,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";
import { NotificationDetails } from "./src/services/types";

export const offchainSchema = pgSchema("broadcast_app_indexer_offchain");

export const channelSubscription = offchainSchema.table(
  "channel_subscription",
  {
    channelId: bigint({ mode: "bigint" }).notNull(),
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

export const neynarNotificationServiceQueueStatus = pgEnum(
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
