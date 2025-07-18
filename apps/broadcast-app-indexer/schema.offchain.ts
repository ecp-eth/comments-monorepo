import {
  integer,
  bigint,
  primaryKey,
  pgSchema,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

export const offchainSchema = pgSchema("broadcast_app_indexer_offchain");

export const channelSubscription = offchainSchema.table(
  "channel_subscription",
  {
    channelId: bigint({ mode: "bigint" }).notNull(),
    userId: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    order: integer().notNull().default(0),
    notificationsEnabled: boolean().notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.channelId, table.userId] })],
);
