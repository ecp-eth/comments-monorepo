import {
  Generated,
  Kysely,
  Selectable,
  sql,
  type MigrationProvider,
} from "kysely";
import type { Hex } from "viem";

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
  comment_id: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  moderation_status: "pending" | "approved" | "rejected";
};

export type IndexerSchemaDB = {
  muted_accounts: MutedAccountsTable;
  api_keys: ApiKeysTable;
  comment_moderation_statuses: CommentModerationStatusesTable;
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
              col.notNull().defaultTo(sql`now()`)
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
              col.notNull().defaultTo(sql`now()`)
            )
            .addColumn("updated_at", "timestamptz", (col) =>
              col.notNull().defaultTo(sql`now()`)
            )
            .addColumn("moderation_status", "text", (col) =>
              col
                .notNull()
                .defaultTo("pending")
                .check(
                  sql`moderation_status IN ('pending', 'approved', 'rejected')`
                )
            )
            .execute();
        },
        down: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema.dropTable("comment_moderation_statuses").execute();
        },
      },
    };
  }
}

export const managementMigrationsProvider = new StaticMigrationsProvider();
