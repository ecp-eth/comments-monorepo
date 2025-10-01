import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5432/postgres";
process.env.SKIP_DRIZZLE_SCHEMA_DETECTION ??= "1";
process.env.NEYNAR_API_KEY ??= "test";
process.env.ENS_RPC_URL ??= "https://ethereum-rpc.publicnode.com";
process.env.SIM_API_KEY ??= "test";
process.env.JWT_SIWE_NONCE_SECRET ??= "test";
process.env.JWT_ACCESS_TOKEN_SECRET ??= "test";
process.env.JWT_REFRESH_TOKEN_SECRET ??= "test";
process.env.PINATA_JWT ??= "test";
process.env.PINATA_GATEWAY ??= "gateway.pinata.cloud";

export default defineConfig({
  plugins: [
    tsconfigPaths({
      skip: (dir) => dir.includes("demo-rn-expo"),
    }),
  ],
});
