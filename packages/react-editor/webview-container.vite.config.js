import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  root: "src/webview-container",
  build: {
    outDir: "generated",
    cssCodeSplit: false,
  },
});
