import { Kysely, type MigrationProvider } from "kysely";
import type { Hex } from "viem";

export type SpamAccountsTable = {
  account: Hex;
};

export type IndexerSchemaDB = {
  spam_accounts: SpamAccountsTable;
};

class StaticMigrationsProvider implements MigrationProvider {
  async getMigrations() {
    return {
      "2025_03_07_16_00_00_initial": {
        up: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema
            .createTable("spam_accounts")
            .addColumn("account", "text", (col) => col.primaryKey())
            .execute();
        },
        down: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema.dropTable("spam_accounts").execute();
        },
      },
    };
  }
}

export const managementMigrationsProvider = new StaticMigrationsProvider();
