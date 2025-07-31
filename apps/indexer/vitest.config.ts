import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    // @ts-expect-error - ponder has outdated vite + vitest so we have conflicts
    tsconfigPaths({
      skip: (dir) => dir.includes("demo-rn-expo"),
    }),
  ],
});
