import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // @ts-expect-error - ponder has outdated vite + vitest so we have conflicts
  plugins: [tsconfigPaths()],
});
