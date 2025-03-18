#!/usr/bin/env node

import {
  createProgram,
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
  createPrinter,
  NewLineKind,
} from "typescript";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import process from "node:process";

/**
 * This script is prone to changes in packages/sdk/schemas.d.ts, abis.d.ts, index.d.ts
 */

const printer = createPrinter({
  newLine: NewLineKind.LineFeed,
  // remove comments to avoid changing the hash when the comments are changed
  removeComments: true,
});

const program = createProgram({
  options: {
    removeComments: true,
    noUncheckedIndexedAccess: true,

    // Interop constraints
    verbatimModuleSyntax: false,
    esModuleInterop: true,
    isolatedModules: true,
    allowSyntheticDefaultImports: true,
    resolveJsonModule: true,
    declaration: false,

    // Language and environment
    moduleResolution: ModuleResolutionKind.Bundler,
    module: ModuleKind.ESNext,
    noEmit: true,
    lib: ["ES2022"],
    target: ScriptTarget.ES2022,

    // Skip type checking for node modules
    skipLibCheck: true,
    allowJs: true,
  },
  rootNames: [
    resolve(import.meta.dirname, "../src/index.ts"),
    resolve(import.meta.dirname, "../ponder.config.ts"),
    resolve(import.meta.dirname, "../ponder.schema.ts"),
  ],
});

const files = program
  .getSourceFiles()
  .filter((file) => !file.fileName.includes("node_modules"));

const hash = createHash("sha256");

for (const file of files) {
  hash.update(printer.printFile(file));
}

process.stdout.write(hash.digest("hex"));
