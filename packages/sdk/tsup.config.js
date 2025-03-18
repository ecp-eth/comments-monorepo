import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/abis.ts",
    "src/react.tsx",
    "src/schemas.ts",
    "src/types.ts",
  ],
  splitting: true,
  dts: true,
  clean: true,
  sourcemap: false,
  minify: false,
});
