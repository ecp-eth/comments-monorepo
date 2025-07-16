import {
  integer,
  bigint,
  primaryKey,
  pgSchema,
  timestamp,
} from "drizzle-orm/pg-core";

export const offchainSchema = pgSchema("broadcast_app_indexer_offchain");

export const channelSubscription = offchainSchema.table(
  "channel_subscription",
  {
    channelId: bigint({ mode: "bigint" }).notNull(),
    userId: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    order: integer().notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.channelId, table.userId] })],
);
