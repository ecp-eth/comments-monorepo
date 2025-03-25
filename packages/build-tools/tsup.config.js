import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts"
  ],
  splitting: false,
  dts: false,
  clean: true,
  sourcemap: false,
  minify: false,
  bundle: true
});
