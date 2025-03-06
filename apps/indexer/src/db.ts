import {
  type ColumnType,
  Kysely,
  PostgresDialect,
  WithSchemaPlugin,
} from "kysely";
import { Pool } from "pg";

// taken from ponder/src/sync-store/encoding.ts
export type RpcRequestResultsTable = {
  request: string;
  /**
   * This is computed column using md5(request) as hash
   */
  request_hash: ColumnType<string, undefined>;
  chain_id: number;
  block_number: ColumnType<
    string | undefined,
    string | bigint | undefined,
    string | bigint | undefined
  >;
  result: string;
};

let db:
  | Kysely<{
      rpc_request_results: RpcRequestResultsTable;
    }>
  | null
  | undefined = undefined;

export function getDb(): Kysely<{
  rpc_request_results: RpcRequestResultsTable;
}> | null {
  if (db !== undefined) {
    return db;
  }

  const connectionString =
    process.env.PRIVATE_DATABASE_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.log("PGlite is not supported for rpc resuts cache clearing");
    db = null;

    return db;
  }

  db = new Kysely({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString,
        max: 5,
      }),
    }),
    plugins: [new WithSchemaPlugin("ponder_sync")],
  });

  return db;
}
