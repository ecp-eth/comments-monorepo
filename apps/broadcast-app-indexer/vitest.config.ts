import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsconfigPaths({
      skip: (dir) => dir.includes("demo-rn-expo"),
    }),
  ],
});
