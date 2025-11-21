#!/usr/bin/env node

import { execSync } from "child_process";
import {
  existsSync,
  rmSync,
  cpSync,
  readFileSync,
  lstatSync,
  readlinkSync,
  readdirSync,
  writeFileSync,
} from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const INCLUDE_NODE_MODULES = false as boolean;
// process.env.EXCLUDE_NODE_MODULES === "true" ? false : true;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "../../../");

const reactEditorDir = join(rootDir, "packages", "react-editor");
const targetDir = join(
  rootDir,
  "examples",
  "demo-rn-expo",
  "node_modules",
  "@ecp.eth",
  "react-editor",
);
const reactEditorPkg = readFileSync(
  join(reactEditorDir, "package.json"),
  "utf-8",
);
const reactEditorPkgJson = JSON.parse(reactEditorPkg);

/**
 * Recursively converts all symbolic links in a directory to actual copies
 */
function convertSymlinksToCopies(dir: string): void {
  if (!existsSync(dir)) {
    return;
  }

  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    try {
      const stats = lstatSync(fullPath);

      if (stats.isSymbolicLink()) {
        const targetPath = readlinkSync(fullPath);
        // Resolve the symlink target (handles both absolute and relative paths)
        const resolvedTarget = resolve(dirname(fullPath), targetPath);

        console.log(`   Converting symlink: ${entry.name} -> ${targetPath}`);

        // Remove the symlink
        rmSync(fullPath, { force: true });

        // Copy the actual contents
        if (existsSync(resolvedTarget)) {
          const targetStats = lstatSync(resolvedTarget);
          if (targetStats.isDirectory()) {
            cpSync(resolvedTarget, fullPath, { recursive: true });
          } else {
            cpSync(resolvedTarget, fullPath);
          }
        } else {
          console.warn(
            `   ⚠️  Symlink target does not exist: ${resolvedTarget}`,
          );
        }
      } else if (stats.isDirectory()) {
        // Recursively process subdirectories
        convertSymlinksToCopies(fullPath);
      }
    } catch (error) {
      console.warn(`   ⚠️  Error processing ${fullPath}:`, error);
    }
  }
}

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
    if (INCLUDE_NODE_MODULES === false && src.endsWith("node_modules")) {
      return false;
    }
    return true;
  },
});

if ("peerDependencies" in reactEditorPkgJson) {
  for (const [peerName, peerVersion] of Object.entries(
    reactEditorPkgJson.peerDependencies,
  )) {
    const modulePath = `node_modules/${peerName}`;
    console.log(`module path to delete ${modulePath}`);
    execSync(`rm -rf ${modulePath}`, {
      cwd: targetDir,
      stdio: "inherit",
    });
  }
}

console.log("✅ Files copied successfully");

console.log("\n🔗 Step 4: update package.json to remove devDependencies");
reactEditorPkgJson.devDependencies = {};
writeFileSync(
  join(targetDir, "package.json"),
  JSON.stringify(reactEditorPkgJson, null, 2),
);
console.log("✅ updated\n");

// console.log("\n🔗 Step 5: pnpm/npm install...");
// execSync(`pnpm install`, {
//   cwd: targetDir,
//   stdio: "inherit",
// });
// console.log("✅ installed dependencies\n");

// console.log("\n🔗 Step 4: Converting symbolic links to actual copies...");
// convertSymlinksToCopies(resolve(targetDir, "node_modules"));
// console.log("✅ Symbolic links converted\n");

console.log("🎉 All done! react-editor has been synced to demo-rn-expo");
