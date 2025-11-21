import tailwindConfig from "./tailwind.config.js";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import fs, { mkdir } from "fs";
import path from "path";
import { promisify } from "util";

const exportCSSPlugin = () => {
  return {
    postcssPlugin: "postcss-export-js",
    async Once(root) {
      const tsupOpts = globalThis._tsupOpts;
      if (!tsupOpts?.outDir) {
        return;
      }
      const css = root.toString();
      await promisify(mkdir)(path.resolve(tsupOpts.outDir), {
        recursive: true,
      });
      const outFile = path.resolve(tsupOpts.outDir, "editor.css.js");

      const content =
        tsupOpts.format[0] === "esm"
          ? `export const css = ${JSON.stringify(css)};`
          : `module.exports = { css: ${JSON.stringify(css)} };`;

      fs.writeFileSync(outFile, content);
    },
  };
};
exportCSSPlugin.postcss = true;

export default {
  plugins: [
    tailwindcss({
      config: tailwindConfig,
    }),
    autoprefixer,
    exportCSSPlugin(),
  ],
};
