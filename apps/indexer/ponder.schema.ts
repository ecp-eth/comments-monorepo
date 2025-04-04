import { index, onchainTable, relations } from "ponder";

// Custom type for addresses that supports both Ethereum (40 chars) and World (64 chars) addresses
const addressType = (t: any) =>
  t
    .text()
    .notNull()
    .pattern(/^(0x)?([0-9a-fA-F]{40}|[0-9a-fA-F]{64})$/);

export const comment = onchainTable(
  "comment",
  (t) => ({
    id: t.text().primaryKey(),
    content: t.text().notNull(),
    metadata: t.text().notNull(),
    targetUri: t.text().notNull(),
    parentId: t.hex(),
    author: addressType(t),
    timestamp: t.timestamp({ withTimezone: true }).notNull(),
    deletedAt: t.timestamp({ withTimezone: true }),
    chainId: t.integer().notNull(),
    appSigner: addressType(t),
    txHash: t.hex().notNull(),
    logIndex: t.integer(),
    moderationStatus: t
      .text({
        enum: ["pending", "approved", "rejected"],
      })
      .default("pending")
      .notNull(),
    moderationStatusChangedAt: t.timestamp({ withTimezone: true }).notNull(),
  }),
  (table) => ({
    targetUriIdx: index().on(table.targetUri),
    parentIdIdx: index().on(table.parentId),
    appSignerIdx: index().on(table.appSigner),
    timestampIdx: index().on(table.timestamp),
    deletedAtIdx: index().on(table.deletedAt),
    authorIdx: index().on(table.author),
    moderationStatusIdx: index().on(table.moderationStatus),
  })
);

export type CommentSelectType = typeof comment.$inferSelect;
export type CommentInsertType = typeof comment.$inferInsert;

export const approvals = onchainTable(
  "approvals",
  (t) => ({
    id: t.text().primaryKey(),
    author: addressType(t),
    appSigner: addressType(t),
    chainId: t.integer().notNull(),
    txHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),
    deletedAt: t.timestamp({ withTimezone: true }),
  }),
  (table) => ({
    authorIdx: index().on(table.author),
    appSignerIdx: index().on(table.appSigner),
    chainIdIdx: index().on(table.chainId),
    deletedAtIdx: index().on(table.deletedAt),
  })
);

export const commentRelations = relations(comment, ({ one, many }) => ({
  // Each comment may have many response comments (children) that reference it.
  replies: many(comment, {
    relationName: "comment_replies",
  }),
  // Each comment may have one parent comment, referenced by parentId.
  parent: one(comment, {
    relationName: "comment_replies",
    fields: [comment.parentId],
    references: [comment.id],
  }),
}));
