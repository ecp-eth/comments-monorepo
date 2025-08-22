import { sql, relations } from "drizzle-orm";
import {
  integer,
  primaryKey,
  pgSchema,
  timestamp,
  doublePrecision,
  text,
  index,
  jsonb,
  uuid,
  check,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { ECP_INDEXER_SCHEMA_NAME } from "./src/constants.ts";
import type { Hex } from "viem";
import type { CommentReportStatus } from "./src/management/types";
import type {
  CommentModerationLabelsWithScore,
  ModerationStatus,
} from "./src/services/types";

export const offchainSchema = pgSchema(ECP_INDEXER_SCHEMA_NAME);

export const apiKeys = offchainSchema.table(
  "api_keys",
  {
    id: text().notNull().primaryKey(),
    publicKey: text().notNull(),
    name: text().notNull().unique(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp({ withTimezone: true }),
  },
  (table) => [index("api_keys_by_public_key_idx").on(table.id)],
);

export const commentClassificationResults = offchainSchema.table(
  "comment_classification_results",
  {
    commentId: text().notNull().$type<Hex>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    labels: jsonb().notNull().$type<CommentModerationLabelsWithScore>(),
    score: doublePrecision().notNull(),
    revision: integer().notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.commentId, table.revision] })],
);

export const commentModerationStatuses = offchainSchema.table(
  "comment_moderation_statuses",
  {
    commentId: text().notNull().$type<Hex>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    moderationStatus: text()
      .notNull()
      .default("pending")
      .$type<ModerationStatus>(),
    updatedBy: text().notNull().default("premoderation"),
    revision: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.commentId, table.revision] }),
    check(
      "moderation_status_enum",
      sql`${table.moderationStatus} IN ('pending', 'approved', 'rejected')`,
    ),
    index("comment_moderation_statuses_by_status_idx").on(
      table.moderationStatus,
    ),
  ],
);

export type CommentModerationStatusesSelectType =
  typeof commentModerationStatuses.$inferSelect;

export const commentReports = offchainSchema.table(
  "comment_reports",
  {
    id: uuid().notNull().primaryKey().defaultRandom(),
    commentId: text().notNull().$type<Hex>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    reportee: text().notNull().$type<Hex>(),
    message: text().notNull(),
    status: text().notNull().default("pending").$type<CommentReportStatus>(),
  },
  (table) => [
    check(
      "comment_report_status_enum",
      sql`${table.status} IN ('pending', 'resolved', 'closed')`,
    ),
    index("comment_reports_by_status_idx").on(table.status),
    index("comment_reports_by_created_at_idx").on(table.createdAt),
  ],
);

export type CommentReportSelectType = typeof commentReports.$inferSelect;

export const mutedAccounts = offchainSchema.table("muted_accounts", {
  account: text().notNull().primaryKey().$type<Hex>(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  reason: text(),
});

export type MutedAccountSelectType = typeof mutedAccounts.$inferSelect;

export const user = offchainSchema.table("user", {
  id: uuid().primaryKey().defaultRandom(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const userRelations = relations(user, ({ many }) => ({
  authCredentials: many(userAuthCredentials),
  authSessions: many(userAuthSession),
}));

export const userAuthCredentials = offchainSchema.table(
  "user_auth_credentials",
  {
    id: uuid().primaryKey().defaultRandom(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    userId: uuid()
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    method: text().notNull(),
    identifier: text().notNull(),
  },
  (table) => [
    unique("user_auth_credentials_by_method_and_identifier_uq").on(
      table.method,
      table.identifier,
    ),
  ],
);

export const userAuthCredentialsRelations = relations(
  userAuthCredentials,
  ({ one }) => ({
    user: one(user, {
      fields: [userAuthCredentials.userId],
      references: [user.id],
    }),
  }),
);

export const userAuthSession = offchainSchema.table("user_auth_session", {
  id: uuid().primaryKey().defaultRandom(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  userId: uuid()
    .notNull()
    .references(() => user.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  userAuthCredentialsId: uuid()
    .notNull()
    .references(() => userAuthCredentials.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
});

export const userAuthSessionRelations = relations(
  userAuthSession,
  ({ one }) => ({
    user: one(user, {
      fields: [userAuthSession.userId],
      references: [user.id],
    }),
    authCredentials: one(userAuthCredentials, {
      fields: [userAuthSession.userAuthCredentialsId],
      references: [userAuthCredentials.id],
    }),
  }),
);

export const userAuthSessionSiweRefreshToken = offchainSchema.table(
  "user_auth_session_siwe_refresh_token",
  {
    id: uuid().primaryKey().defaultRandom(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    userAuthSessionId: uuid()
      .notNull()
      .references(() => userAuthSession.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    isUsed: boolean().notNull().default(false),
  },
);

export const userAuthSessionSiweRefreshTokenRelations = relations(
  userAuthSessionSiweRefreshToken,
  ({ one }) => ({
    userAuthSession: one(userAuthSession, {
      fields: [userAuthSessionSiweRefreshToken.userAuthSessionId],
      references: [userAuthSession.id],
    }),
  }),
);
