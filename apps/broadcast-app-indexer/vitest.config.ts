import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    // @ts-expect-error - something incompatible regarding the types
    tsconfigPaths({
      skip: (dir) => dir.includes("demo-rn-expo"),
    }),
  ],
});
