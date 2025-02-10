import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/abis.ts",
    "src/eip712.ts",
    "src/schemas.ts",
    "src/utils.ts",
    "src/wagmi.ts",
  ],
  splitting: true,
  dts: true,
  format: "esm",
  clean: true,
  sourcemap: false,
  minify: false,
});
