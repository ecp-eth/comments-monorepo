import {
  type Generated,
  type Kysely,
  type Selectable,
  sql,
  type MigrationProvider,
} from "kysely";
import type { Hex } from "viem";
import type { CommentModerationStatus, CommentReportStatus } from "./types";
import type { CommentModerationLabelsWithScore } from "../services/types";

export type MutedAccountsTable = {
  account: Hex;
  created_at: Generated<Date>;
  reason: string | null;
};

export type ApiKeysTable = {
  id: string;
  public_key: string;
  name: string;
  created_at: Date;
  last_used_at: Date | null;
};

export type CommentModerationStatusesTable = {
  comment_id: Hex;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  moderation_status: CommentModerationStatus;
};

export type CommentClassificationResultsTable = {
  comment_id: Hex;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  labels: CommentModerationLabelsWithScore;
  score: number;
};

export type CommentReportsTable = {
  id: Generated<string>;
  comment_id: Hex;
  reportee: Hex;
  message: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  status: CommentReportStatus;
};

export type CommentReportSelectType = Selectable<CommentReportsTable>;

export type IndexerSchemaDB = {
  muted_accounts: MutedAccountsTable;
  api_keys: ApiKeysTable;
  comment_moderation_statuses: CommentModerationStatusesTable;
  comment_classification_results: CommentClassificationResultsTable;
  comment_reports: CommentReportsTable;
};

export type MutedAccountSelect = Selectable<MutedAccountsTable>;

class StaticMigrationsProvider implements MigrationProvider {
  async getMigrations() {
    return {
      "2025_03_07_16_00_00_initial": {
        up: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema
            .createTable("muted_accounts")
            .addColumn("account", "text", (col) => col.primaryKey())
            .addColumn("created_at", "timestamp", (col) =>
              col.notNull().defaultTo(sql`now()`),
            )
            .addColumn("reason", "text")
            .execute();
        },
        down: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema.dropTable("muted_accounts").execute();
        },
      },
      "2025_03_10_09_20_00_auth_keys": {
        up: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema
            .createTable("api_keys")
            .addColumn("id", "text", (col) => col.primaryKey())
            .addColumn("public_key", "text", (col) => col.notNull())
            .addColumn("name", "text", (col) => col.notNull().unique())
            .addColumn("created_at", "timestamp", (col) => col.notNull())
            .addColumn("last_used_at", "timestamp")
            .execute();
        },
        down: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema.dropTable("api_keys").execute();
        },
      },
      "2025_03_26_10_52_00_comments_moderation": {
        up: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema
            .createTable("comment_moderation_statuses")
            .addColumn("comment_id", "text", (col) => col.primaryKey())
            .addColumn("created_at", "timestamptz", (col) =>
              col.notNull().defaultTo(sql`now()`),
            )
            .addColumn("updated_at", "timestamptz", (col) =>
              col.notNull().defaultTo(sql`now()`),
            )
            .addColumn("moderation_status", "text", (col) =>
              col
                .notNull()
                .defaultTo("pending")
                .check(
                  sql`moderation_status IN ('pending', 'approved', 'rejected')`,
                ),
            )
            .execute();
        },
        down: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema.dropTable("comment_moderation_statuses").execute();
        },
      },
      "2025_07_09_13_37_00_comments_classification": {
        up: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema
            .createTable("comment_classification_results")
            .addColumn("comment_id", "text", (col) => col.primaryKey())
            .addColumn("created_at", "timestamptz", (col) =>
              col.notNull().defaultTo(sql`now()`),
            )
            .addColumn("updated_at", "timestamptz", (col) =>
              col.notNull().defaultTo(sql`now()`),
            )
            .addColumn("labels", "jsonb", (col) => col.notNull())
            .addColumn("score", "double precision", (col) => col.notNull())
            .execute();
        },
        down: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema.dropTable("comment_classification_results").execute();
        },
      },
      "2025_07_09_15_53_00_comment_reports": {
        up: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema
            .createTable("comment_reports")
            .addColumn("id", "text", (col) =>
              col.primaryKey().defaultTo(sql`gen_random_uuid()`),
            )
            .addColumn("comment_id", "text", (col) => col.notNull())
            .addColumn("created_at", "timestamptz", (col) =>
              col.notNull().defaultTo(sql`now()`),
            )
            .addColumn("updated_at", "timestamptz", (col) =>
              col.notNull().defaultTo(sql`now()`),
            )
            .addColumn("reportee", "text", (col) => col.notNull())
            .addColumn("message", "text")
            .addColumn("status", "text", (col) =>
              col
                .notNull()
                .defaultTo("pending")
                .check(sql`status IN ('pending', 'resolved', 'closed')`),
            )
            .execute();

          await db.schema
            .createIndex("comment_reports_by_status_idx")
            .on("comment_reports")
            .column("status")
            .execute();
        },
        down: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema.dropTable("comment_reports").execute();
        },
      },
    };
  }
}

export const managementMigrationsProvider = new StaticMigrationsProvider();
