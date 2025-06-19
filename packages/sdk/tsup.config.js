import { defineConfig } from "tsup";
import process from "node:process";

// Explicit entry points that match package.json exports
// This prevents building unnecessary files and reduces memory usage
const entry = [
  // Main exports
  "src/index.ts",
  "src/abis.ts",
  "src/constants.ts",

  // Channel manager
  "src/channel-manager/index.ts",
  "src/channel-manager/react/index.ts",
  "src/channel-manager/types.ts",

  // Comments
  "src/comments/index.ts",
  "src/comments/react/index.ts",

  // Core
  "src/core/index.ts",

  // Embed
  "src/embed/index.ts",
  "src/embed/schemas/index.ts",

  // Indexer
  "src/indexer/index.ts",
];

export default defineConfig({
  entry: entry,
  splitting: false,
  dts: true,
  clean: true,
  sourcemap: false,
  minify: false,
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== "production"),
  },
});
