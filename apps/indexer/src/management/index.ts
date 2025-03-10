import { Migrator } from "kysely";
import { managementMigrationsProvider } from "./migrations";
import { getIndexerDb } from "./db";

const SCHEMA_NAME = "ecp_indexer_schema";

/**
 * This method initializes indexer's management system.
 */
export async function initializeManagement() {
  const db = getIndexerDb();

  const migrator = new Migrator({
    db,
    provider: managementMigrationsProvider,
    migrationTableSchema: SCHEMA_NAME,
  });

  const { error } = await migrator.migrateToLatest();

  if (error) {
    throw new Error(`Failed to migrate indexer db: ${error}`);
  }
}
