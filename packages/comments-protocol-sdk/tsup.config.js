import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/abis.ts", "src/react.ts", "src/types.ts"],
  splitting: true,
  dts: true,
  format: "esm",
  clean: true,
  sourcemap: false,
  minify: false,
});
