import { Kysely, PostgresDialect, WithSchemaPlugin } from "kysely";
import { env } from "../env";
import { Pool } from "pg";
import { IndexerSchemaDB } from "./migrations";

const SCHEMA_NAME = "ecp_indexer_schema";

let db: Kysely<IndexerSchemaDB> | undefined = undefined;

export function getIndexerDb(): Kysely<IndexerSchemaDB> {
  if (db !== undefined) {
    return db;
  }

  db = new Kysely({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: env.DATABASE_URL,
        max: 10,
      }),
    }),
    plugins: [new WithSchemaPlugin(SCHEMA_NAME)],
    ...(process.env.NODE_ENV === "development" && { log: console.log }),
  });

  return db;
}
