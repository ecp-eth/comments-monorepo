import { index, onchainTable, relations } from "ponder";
import type {
  IndexerAPICommentReferencesSchemaType,
  IndexerAPICommentZeroExSwapSchemaType,
} from "@ecp.eth/sdk/indexer/schemas";
import type { MetadataEntrySchemaType } from "@ecp.eth/sdk/indexer/schemas";

export const comments = onchainTable(
  "comments",
  (t) => ({
    id: t.hex().primaryKey(),
    createdAt: t.timestamp({ withTimezone: true }).notNull(),
    updatedAt: t.timestamp({ withTimezone: true }).notNull(),
    channelId: t.bigint().notNull(),
    content: t.text().notNull(),
    metadata: t.jsonb().$type<MetadataEntrySchemaType[]>(),
    hookMetadata: t.jsonb().$type<MetadataEntrySchemaType[]>(),
    targetUri: t.text().notNull(),
    commentType: t.integer().notNull(),
    parentId: t.hex(),
    rootCommentId: t.hex(),
    author: t.hex().notNull(),
    deletedAt: t.timestamp({ withTimezone: true }),
    chainId: t.integer().notNull(),
    app: t.hex().notNull(),
    txHash: t.hex().notNull(),
    logIndex: t.integer(),
    moderationStatus: t
      .text({
        enum: ["pending", "approved", "rejected"],
      })
      .default("pending")
      .notNull(),
    moderationStatusChangedAt: t.timestamp({ withTimezone: true }).notNull(),
    revision: t.integer().notNull().default(0),
    // find a way to define the column value as object or null
    zeroExSwap: t.jsonb().$type<IndexerAPICommentZeroExSwapSchemaType | null>(),
    references: t
      .jsonb()
      .notNull()
      .$type<IndexerAPICommentReferencesSchemaType>()
      .default([]),
    referencesResolutionStatus: t
      .text({ enum: ["success", "pending", "partial", "failed"] })
      .notNull()
      .default("pending"),
    referencesResolutionStatusChangedAt: t
      .timestamp({ withTimezone: true })
      .notNull(),
  }),
  (table) => ({
    targetUriIdx: index().on(table.targetUri),
    parentIdIdx: index().on(table.parentId),
    appIdx: index().on(table.app),
    createdAtIdx: index().on(table.createdAt),
    deletedAtIdx: index().on(table.deletedAt),
    authorIdx: index().on(table.author),
    moderationStatusIdx: index().on(table.moderationStatus),
    rootCommentIdIdx: index().on(table.rootCommentId),
    channelIdIdx: index().on(table.channelId),
    commentTypeIdx: index().on(table.commentType),
    referencesResolutionStatusIdx: index().on(table.referencesResolutionStatus),
    referencesResolutionStatusChangedAtIdx: index().on(
      table.referencesResolutionStatusChangedAt,
    ),
  }),
);

export type CommentSelectType = typeof comments.$inferSelect;
export type CommentInsertType = typeof comments.$inferInsert;

export const approvals = onchainTable(
  "approvals",
  (t) => ({
    id: t.text().primaryKey(),
    author: t.hex().notNull(),
    app: t.hex().notNull(),
    chainId: t.integer().notNull(),
    txHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),
    deletedAt: t.timestamp({ withTimezone: true }),
  }),
  (table) => ({
    authorIdx: index().on(table.author),
    appIdx: index().on(table.app),
    chainIdIdx: index().on(table.chainId),
    deletedAtIdx: index().on(table.deletedAt),
  }),
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
  // Each comment may have one root comment, referenced by rootCommentId.
  root: one(comments, {
    relationName: "comment_flat_replies",
    fields: [comments.rootCommentId],
    references: [comments.id],
  }),
  // Each root comment may have many replies (children) that reference it.
  flatReplies: many(comments, {
    relationName: "comment_flat_replies",
  }),
}));
