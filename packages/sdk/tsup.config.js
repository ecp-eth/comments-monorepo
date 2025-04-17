import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/abis.ts",
    "src/react.tsx",
    "src/schemas/index.ts",
    "src/types.ts",
    "src/channel-manager/contract.ts",
    "src/channel-manager/react/index.ts",
    "src/comments/contract.ts",
  ],
  splitting: true,
  dts: true,
  clean: true,
  sourcemap: false,
  minify: false,
});
