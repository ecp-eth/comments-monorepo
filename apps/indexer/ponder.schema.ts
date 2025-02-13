import { index, onchainTable, relations } from "ponder";

export const comment = onchainTable(
  "comment",
  (t) => ({
    id: t.text().primaryKey(),
    content: t.text().notNull(),
    metadata: t.text().notNull(),
    targetUri: t.text().notNull(),
    parentId: t.hex(),
    author: t.hex().notNull(),
    // https://github.com/ponder-sh/ponder/issues/1240
    timestamp: t.timestamp({ withTimezone: true }).notNull(),
    deletedAt: t.timestamp({ withTimezone: true }),
    chainId: t.integer().notNull(),
    appSigner: t.hex().notNull(),
    txHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),
  }),
  (table) => ({
    targetUriIdx: index().on(table.targetUri),
    parentIdIdx: index().on(table.parentId),
    appSignerIdx: index().on(table.appSigner),
    timestampIdx: index().on(table.timestamp),
    deletedAtIdx: index().on(table.deletedAt),
  })
);

export type CommentSelectType = typeof comment.$inferSelect;

export const approvals = onchainTable(
  "approvals",
  (t) => ({
    id: t.text().primaryKey(),
    author: t.hex().notNull(),
    appSigner: t.hex().notNull(),
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
