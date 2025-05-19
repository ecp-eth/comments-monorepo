#!/usr/bin/env node

import { spawn } from "child_process";
import path from "path";

const scriptPath = path.resolve(import.meta.dirname, "../src/proxy-package.ts");

const childProcess = spawn(
  "pnpm",
  ["dlx", "tsx", scriptPath, ...process.argv.slice(2)],
  {
    stdio: "inherit",
  },
);

childProcess.on("exit", (code) => {
  process.exit(code);
});
