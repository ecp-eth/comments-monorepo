import { setDatabaseSchema } from "@ponder/client";
import * as onchainSchema from "./ponder.schema.ts";
import * as offchainSchema from "./schema.offchain.ts";
import { env } from "./src/env.ts";

declare global {
  // eslint-disable-next-line no-var
  var PONDER_NAMESPACE_BUILD: {
    schema: string;
  } | null;
}

let schemaName: string;

if (globalThis.PONDER_NAMESPACE_BUILD) {
  schemaName = globalThis.PONDER_NAMESPACE_BUILD.schema;
} else if (env.SKIP_DRIZZLE_SCHEMA_DETECTION) {
  schemaName = "public";

  console.warn(
    "Do not use SKIP_DRIZZLE_SCHEMA_DETECTION if you actually want to use the real database. This is useful only for docs generation.",
  );
} else if (env.DATABASE_SCHEMA) {
  schemaName = env.DATABASE_SCHEMA;
} else {
  throw new Error(
    "Please set the DATABASE_SCHEMA environment variable to the name of the schema you want to use for the indexer on chain data or run this script using ponder start/dev/serve.",
  );
}

console.log("On chain db schema uses schema name", schemaName);

setDatabaseSchema(onchainSchema, schemaName);

export const schema = {
  ...onchainSchema,
  ...offchainSchema,
};
