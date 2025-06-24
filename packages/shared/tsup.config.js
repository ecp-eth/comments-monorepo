import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.{ts,tsx}"],
  splitting: true,
  dts: true,
  format: "esm",
  clean: true,
  sourcemap: false,
  minify: false,
});
