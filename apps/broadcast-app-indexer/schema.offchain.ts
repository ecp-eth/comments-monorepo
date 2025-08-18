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
import { sql } from "drizzle-orm";

export const offchainSchema = pgSchema("broadcast_app_indexer_offchain");

export const authSiweSession = offchainSchema.table("auth_siwe_session", {
  id: uuid().notNull().defaultRandom().primaryKey(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
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

export const userFarcasterMiniAppSettings = offchainSchema.table(
  "user_farcaster_mini_app_settings",
  {
    appId: text().notNull(),
    userAddress: text().notNull(),
    userFid: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    notificationsEnabled: boolean().notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.appId, table.userAddress, table.userFid] }),
    index("ufmas_user_address_idx").on(table.userAddress),
    index("ufmas_user_fid_idx").on(table.userFid),
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
        name: "csfns_settings_pk",
        columns: [
          table.channelId,
          table.appId,
          table.userAddress,
          table.userFid,
        ],
      }),
      index("csfn_enabled_notification_by_channel_app_idx")
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
