import { index, onchainTable, relations } from "ponder";

export const comments = onchainTable(
  "comments",
  (t) => ({
    id: t.hex().primaryKey(),
    content: t.text().notNull(),
    metadata: t.text().notNull(),
    targetUri: t.text().notNull(),
    parentId: t.hex(),
    rootCommentId: t.hex().notNull(),
    author: t.hex().notNull(),
    timestamp: t.timestamp({ withTimezone: true }).notNull(),
    deletedAt: t.timestamp({ withTimezone: true }),
    chainId: t.integer().notNull(),
    appSigner: t.hex().notNull(),
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
    rootCommentIdIdx: index().on(table.rootCommentId),
  })
);

export type CommentSelectType = typeof comments.$inferSelect;
export type CommentInsertType = typeof comments.$inferInsert;

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

export const commentRelations = relations(comments, ({ one, many }) => ({
  // Each comment may have many response comments (children) that reference it.
  replies: many(comments, {
    relationName: "comment_replies",
  }),
  // Each comment may have one parent comment, referenced by parentId.
  parent: one(comments, {
    relationName: "comment_replies",
    fields: [comments.parentId],
    references: [comments.id],
  }),
  // Each comment may have one root comment, referenced by rootCommentId
  rootParent: one(comments, {
    relationName: "comment_root_replies",
    fields: [comments.rootCommentId],
    references: [comments.id],
  }),
  // Each root comment may have many descendant replies that reference it, regardless of the depth
  flatReplies: many(comments, {
    relationName: "comment_root_replies",
  }),
}));
