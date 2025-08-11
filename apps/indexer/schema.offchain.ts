import { sql } from "drizzle-orm";
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
} from "drizzle-orm/pg-core";
import { ECP_INDEXER_SCHEMA_NAME } from "./src/constants";

export const offchainSchema = pgSchema(ECP_INDEXER_SCHEMA_NAME);

export const apiKeys = offchainSchema.table("api_keys", {
  id: text().notNull().primaryKey(),
  publicKey: text().notNull(),
  name: text().notNull().unique(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp({ withTimezone: true }),
});

export const commentClassificationResults = offchainSchema.table(
  "comment_classification_results",
  {
    commentId: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    labels: jsonb().notNull(),
    score: doublePrecision().notNull(),
    revision: integer().notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.commentId, table.revision] })],
);

export const commentModerationStatuses = offchainSchema.table(
  "comment_moderation_statuses",
  {
    commentId: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    moderationStatus: text().notNull().default("pending"),
    revision: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.commentId, table.revision] }),
    check(
      "moderation_status_enum",
      sql`${table.moderationStatus} IN ('pending', 'approved', 'rejected')`,
    ),
  ],
);

export const commentReports = offchainSchema.table(
  "comment_reports",
  {
    id: uuid().notNull().primaryKey().defaultRandom(),
    commentId: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    reportee: text().notNull(),
    message: text().notNull(),
    status: text().notNull().default("pending"),
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

export const mutedAccounts = offchainSchema.table("muted_accounts", {
  account: text().notNull().primaryKey(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  reason: text(),
});
