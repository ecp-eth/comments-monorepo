import { setDatabaseSchema } from "@ponder/client";
import { env } from "./src/env";
import * as onchainSchema from "./ponder.schema";
import * as offchainSchema from "./schema.offchain";

setDatabaseSchema(onchainSchema, env.DATABASE_SCHEMA);

export const schema = {
  ...onchainSchema,
  ...offchainSchema,
};
