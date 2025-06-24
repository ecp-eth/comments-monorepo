import { defineConfig } from "tsup";
import process from "node:process";
import path from "node:path";
import fs from "node:fs/promises";

const cwd = import.meta.dirname;
const srcDir = path.join(cwd, "src");

const files = await fs.readdir(srcDir, {
  recursive: true,
  withFileTypes: true,
});

const entry = files
  .map((file) => {
    const filePath = path.join(file.parentPath, file.name);

    if (file.isDirectory()) {
      return;
    }

    if (filePath.match(/(\/test\/|\.test\.tsx?)/)) {
      return;
    }

    return filePath;
  })
  .filter(Boolean);

export default defineConfig({
  entry,
  splitting: false,
  dts: true,
  clean: true,
  sourcemap: false,
  minify: false,
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== "production"),
  },
});
