import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/wagmi.ts"],
  splitting: true,
  dts: true,
  format: "esm",
  clean: true,
  sourcemap: false,
  minify: false,
});
