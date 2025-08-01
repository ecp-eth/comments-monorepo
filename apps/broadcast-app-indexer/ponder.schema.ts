import { index, onchainTable } from "ponder";
import type { IndexerAPIMetadataSchemaType } from "@ecp.eth/sdk/indexer/schemas";

export const channel = onchainTable(
  "channel",
  (t) => ({
    id: t.bigint().primaryKey(),
    createdAt: t.timestamp({ withTimezone: true }).notNull(),
    updatedAt: t.timestamp({ withTimezone: true }).notNull(),
    chainId: t.integer().notNull(),
    owner: t.hex().notNull(),
    name: t.text().notNull(),
    description: t.text().notNull(),
    metadata: t.jsonb().$type<IndexerAPIMetadataSchemaType>().notNull(),
    txHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),
  }),
  (table) => ({
    createdAtIdx: index().on(table.createdAt),
    updatedAtIdx: index().on(table.updatedAt),
    ownerIdx: index().on(table.owner),
    chainIdIdx: index().on(table.chainId),
  }),
);

export type ChannelSelectType = typeof channel.$inferSelect;
