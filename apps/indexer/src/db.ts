import * as schema from "../ponder.schema";
import * as drizzleTable from "drizzle-orm/table";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "./env";

const table = drizzleTable;

function assertDrizzleSchemaSymbolSupported(
  tableExport: unknown
): asserts tableExport is typeof drizzleTable & {
  readonly Schema: unique symbol;
  trololo: boolean;
} {
  if (
    typeof tableExport !== "object" ||
    tableExport === null ||
    !("Schema" in tableExport) ||
    !tableExport.Schema
  ) {
    throw new Error("Schema symbol is not exported from drizzle-orm/table");
  }
}

if (!env.SKIP_DRIZZLE_SCHEMA_DETECTION) {
  // this is really a hack but we need to somehow check that we are able to use proper pg schema
  assertDrizzleSchemaSymbolSupported(table);

  if (!(table.Schema in schema.approvals) || !schema.approvals[table.Schema]) {
    throw new Error(
      "Schema is not set on the table this will cause the drizzle to load from public schema"
    );
  }
}

/**
 * This is a db client that allows us to write into onchain tables.
 */
export const db = drizzle(env.DATABASE_URL, { schema, casing: "snake_case" });
