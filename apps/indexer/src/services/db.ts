import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { schema } from "../../schema.ts";
import { env } from "../env.ts";

export const db = drizzle(env.DATABASE_URL, {
  schema,
  casing: "snake_case",
});

export type DB = NodePgDatabase<typeof schema>;
