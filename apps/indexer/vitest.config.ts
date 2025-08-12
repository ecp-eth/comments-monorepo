import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

process.env.DATABASE_URL ||=
  "postgresql://postgres:postgres@localhost:5432/postgres";
process.env.DATABASE_SCHEMA ||= "public";
process.env.NEYNAR_API_KEY ||= "test";
process.env.ENS_RPC_URL ||= "https://ethereum-rpc.publicnode.com";
process.env.SIM_API_KEY ||= "test";

export default defineConfig({
  plugins: [
    // @ts-expect-error - ponder has outdated vite + vitest so we have conflicts
    tsconfigPaths({
      skip: (dir) => dir.includes("demo-rn-expo"),
    }),
  ],
});
