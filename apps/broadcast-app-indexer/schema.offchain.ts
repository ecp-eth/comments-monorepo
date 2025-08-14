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
  foreignKey,
} from "drizzle-orm/pg-core";
import type { NotificationDetails } from "./src/services/types";
import type { Hex } from "viem";
import { eq, sql } from "drizzle-orm";

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
    userAddress: text().notNull().$type<Hex>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    order: integer().notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.channelId, table.appId, table.userAddress] }),
  ],
);

export const channelSubscriptionFarcasterNotificationSettings =
  offchainSchema.table(
    "channel_subscription_farcaster_notification_settings",
    {
      channelId: numeric({ scale: 0, precision: 78, mode: "bigint" }).notNull(),
      appId: text().notNull(),
      userAddress: text().notNull().$type<Hex>(),
      userFid: integer().notNull(),
      notificationsEnabled: boolean().notNull().default(false),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
      primaryKey({
        name: "channel_subscription_farcaster_notification_settings_pk",
        columns: [
          table.channelId,
          table.appId,
          table.userAddress,
          table.userFid,
        ],
      }),
      foreignKey({
        name: "channel_subscription_farcaster_notification_settings_channel_id_app_id_user_address_fk",
        columns: [table.channelId, table.appId, table.userAddress],
        foreignColumns: [
          channelSubscription.channelId,
          channelSubscription.appId,
          channelSubscription.userAddress,
        ],
      })
        .onDelete("cascade")
        .onUpdate("cascade"),

      index(
        "channel_subscription_farcaster_notification_settings_enabled_by_channel_app_idx",
      )
        .on(table.channelId, table.appId, table.notificationsEnabled)
        .where(sql`${table.notificationsEnabled} = true`),
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
