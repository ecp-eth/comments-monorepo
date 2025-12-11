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
      const outJSTypeFile = path.resolve(tsupOpts.outDir, "editor.css.js.d.ts");
      const outCSSTypeFile = path.resolve(tsupOpts.outDir, "editor.css.d.ts");

      const content =
        tsupOpts.format[0] === "esm"
          ? `export const css = ${JSON.stringify(css)};`
          : `module.exports = { css: ${JSON.stringify(css)} };`;

      fs.writeFileSync(outFile, content);
      fs.writeFileSync(outJSTypeFile, `export const css: string;`);
      fs.writeFileSync(
        outCSSTypeFile,
        `declare module "@ecp.eth/react-editor/editor.css" {}`,
      );

      console.log(`exported CSS to ${outFile}`);
      console.log(`exported CSS type to ${outCSSTypeFile}`);
      console.log(`exported CSS JS type to ${outJSTypeFile}`);
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
