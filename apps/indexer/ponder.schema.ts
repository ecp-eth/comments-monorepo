import { index, onchainTable, relations } from "ponder";
import type {
  IndexerAPICommentReferencesSchemaType,
  IndexerAPICommentZeroExSwapSchemaType,
} from "@ecp.eth/sdk/indexer/schemas";
import type { IndexerAPIMetadataSchemaType } from "@ecp.eth/sdk/indexer/schemas";
import type { CommentModerationLabelWithScore } from "./src/services/mbd-comment-moderation-classifier";

export const comment = onchainTable(
  "comment",
  (t) => ({
    id: t.hex().primaryKey(),
    createdAt: t.timestamp({ withTimezone: true }).notNull(),
    updatedAt: t.timestamp({ withTimezone: true }).notNull(),
    channelId: t.bigint().notNull(),
    content: t.text().notNull(),
    metadata: t.jsonb().$type<IndexerAPIMetadataSchemaType>(),
    hookMetadata: t.jsonb().$type<IndexerAPIMetadataSchemaType>(),
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
    moderationClassifierResult: t
      .jsonb()
      .$type<CommentModerationLabelWithScore[]>()
      .default([]),
    // keeps the highest score of the moderation labels, can be used to find out if there is any label
    // that has higher score than the threshold
    moderationClassifierScore: t.doublePrecision().notNull().default(0),
    revision: t.integer().notNull().default(0),
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
    referencesResolutionStatusChangedAt: t.timestamp({ withTimezone: true }),
    reactionCounts: t
      .jsonb()
      .$type<Record<string, number>>()
      .default({})
      .notNull(),
  }),
  (table) => ({
    targetUriIdx: index().on(table.targetUri),
    parentIdIdx: index().on(table.parentId),
    chainIdIdx: index().on(table.chainId),
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

export type CommentSelectType = typeof comment.$inferSelect;
export type CommentInsertType = typeof comment.$inferInsert;

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
    hook: t.hex(),
  }),
  (table) => ({
    createdAtIdx: index().on(table.createdAt),
    updatedAtIdx: index().on(table.updatedAt),
    ownerIdx: index().on(table.owner),
    chainIdIdx: index().on(table.chainId),
  }),
);

export type ChannelSelectType = typeof channel.$inferSelect;
export type ChannelInsertType = typeof channel.$inferInsert;

export const approval = onchainTable(
  "approval",
  (t) => ({
    id: t.text().primaryKey(),
    createdAt: t.timestamp({ withTimezone: true }).notNull(),
    updatedAt: t.timestamp({ withTimezone: true }).notNull(),
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

export const commentRelations = relations(comment, ({ one, many }) => ({
  // Each comment may have many direct replies (children) that reference it.
  replies: many(comment, {
    relationName: "comment_replies",
  }),
  // Each comment may have one parent comment, referenced by parentId.
  parent: one(comment, {
    relationName: "comment_replies",
    fields: [comment.parentId],
    references: [comment.id],
  }),
  // Each comment may have one root comment, referenced by rootCommentId.
  root: one(comment, {
    relationName: "comment_flat_replies",
    fields: [comment.rootCommentId],
    references: [comment.id],
  }),
  // Each root comment may have many replies (descendants) that reference it.
  flatReplies: many(comment, {
    relationName: "comment_flat_replies",
  }),
  viewerReactions: many(comment, {
    relationName: "comment_viewer_reactions",
  }),
  reactionTarget: one(comment, {
    relationName: "comment_viewer_reactions",
    fields: [comment.parentId],
    references: [comment.id],
  }),
}));
