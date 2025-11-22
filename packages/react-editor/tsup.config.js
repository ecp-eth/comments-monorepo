import { defineConfig } from "tsup";
import process from "node:process";
import path from "node:path";
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";

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

    if (filePath.match(/(\/test\/|\.test\.tsx|\.d\.ts|\.html?)/)) {
      return;
    }

    return filePath;
  })
  .filter(Boolean);

export default defineConfig({
  entry,
  // split should not be set to false, when it is false it will generate
  // a single chunk file with all the dependencies, which will cause react
  // context to be duplicated
  splitting: true,
  dts: true,
  clean: true,
  sourcemap: false,
  minify: false,
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== "production"),
  },
  loader: {
    ".html": "text",
  },
  // esbuildOptions(options) {
  //   // Configure esbuild to handle HTML files as text
  //   options.loader = {
  //     ...options.loader,
  //     ".html": "text",
  //   };

  //   // options.resolveExtensions = [...options.resolveExtensions, "*.html"];
  // },
  // esbuildPlugins: [
  //   {
  //     name: "html-loader",
  //     setup(build) {
  //       // Handle .html files
  //       build.onLoad({ filter: /\.html$/ }, (args) => {
  //         const contents = readFileSync(args.path, "utf8");
  //         return {
  //           contents: JSON.stringify(contents),
  //           loader: "text",
  //         };
  //       });
  //     },
  //   },
  // ],
});
