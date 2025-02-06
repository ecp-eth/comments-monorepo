import { index, onchainTable, relations } from "ponder";

export const comment = onchainTable(
  "comment",
  (t) => ({
    id: t.text().primaryKey(),
    content: t.text(),
    metadata: t.text(),
    targetUrl: t.text(),
    parentId: t.hex(),
    author: t.hex(),
    timestamp: t.timestamp(),
    chainId: t.integer(),
    deletedAt: t.timestamp(),
    appSigner: t.hex(),
    txHash: t.hex(),
    logIndex: t.integer(),
  }),
  (table) => ({
    targetUrlIdx: index().on(table.targetUrl),
    parentIdIdx: index().on(table.parentId),
    appSignerIdx: index().on(table.appSigner),
    timestampIdx: index().on(table.timestamp),
    deletedAtIdx: index().on(table.deletedAt),
  })
);

export const approvals = onchainTable(
  "approvals",
  (t) => ({
    id: t.text().primaryKey(),
    author: t.hex(),
    appSigner: t.hex(),
    chainId: t.integer(),
    txHash: t.hex(),
    logIndex: t.integer(),
    deletedAt: t.timestamp(),
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
