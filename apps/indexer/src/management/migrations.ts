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

export type IndexerSchemaDB = {
  muted_accounts: MutedAccountsTable;
  api_keys: ApiKeysTable;
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
    };
  }
}

export const managementMigrationsProvider = new StaticMigrationsProvider();
