import { defineConfig } from "drizzle-kit";
import { env } from "./src/env";

export default defineConfig({
  dialect: "postgresql",
  schema: "./schema.offchain.ts",
  casing: "snake_case",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  migrations: {
    table: "__ecp_indexer_migrations",
    schema: "ecp_indexer_drizzle",
  },
});
