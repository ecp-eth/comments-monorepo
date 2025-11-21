#!/usr/bin/env node

import { execSync } from "child_process";
import { existsSync, rmSync, cpSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const INCLUDE_NODE_MODULES: boolean =
  process.env.EXCLUDE_NODE_MODULES === "true" ? false : true;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

const reactEditorDir = join(rootDir, "packages", "react-editor");
const targetDir = join(
  rootDir,
  "examples",
  "demo-rn-expo",
  "node_modules",
  "@ecp.eth",
  "react-editor",
);

console.log("📋 Configuration:");
console.log(`   Root: ${rootDir}`);
console.log(`   Source: ${reactEditorDir}`);
console.log(`   Target: ${targetDir}`);

console.log("\n🔨 Step 1: Building react-editor package...");
try {
  execSync("pnpm run build:dev", {
    cwd: reactEditorDir,
    stdio: "inherit",
  });
  console.log("✅ Build completed successfully");
} catch (error) {
  console.error("❌ Build failed:", error);
  process.exit(1);
}

console.log("🗑️  Step 2: Removing existing react-editor from node_modules...");
if (existsSync(targetDir)) {
  rmSync(targetDir, { recursive: true, force: true });
  console.log("✅ Removed existing directory");
} else {
  console.log("ℹ️  Target directory doesn't exist, skipping removal");
}

console.log("📦 Step 3: Copying react-editor files to node_modules...");

// Ensure the parent directory exists
const targetParentDir = dirname(targetDir);
if (!existsSync(targetParentDir)) {
  throw new Error(`Target parent directory does not exist: ${targetParentDir}`);
}

console.log(
  `   Copying files ${INCLUDE_NODE_MODULES ? "" : "(excluding node_modules)"}...`,
);

// Copy all files and folders except node_modules
cpSync(reactEditorDir, targetDir, {
  recursive: true,
  filter: (src) => {
    // Exclude node_modules directory
    const relativePath = src.replace(reactEditorDir, "");
    if (
      INCLUDE_NODE_MODULES === false &&
      (relativePath.includes("/node_modules") ||
        relativePath.includes("\\node_modules"))
    ) {
      return false;
    }
    // Exclude if the path itself is node_modules
    if (src.endsWith("node_modules")) {
      return false;
    }
    return true;
  },
});

console.log("✅ Files copied successfully\n");
console.log("🎉 All done! react-editor has been synced to demo-rn-expo");
