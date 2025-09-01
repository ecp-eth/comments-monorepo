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
    table: "__broadcast_app_indexer_migrations",
    schema: "broadcast_app_indexer_drizzle",
  },
});
