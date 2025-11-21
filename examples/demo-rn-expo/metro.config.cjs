const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
// const { execSync } = require("child_process");
const projectRoot = __dirname;

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// // Get pnpm global node_modules path
// let pnpmGlobalPath;
// try {
//   pnpmGlobalPath = execSync("pnpm root -g", { encoding: "utf-8" }).trim();
// } catch (error) {
//   console.warn("Failed to get pnpm global path:", error.message);
//   pnpmGlobalPath = null;
// }

const watchFolders = [
  projectRoot,
  // path.resolve(projectRoot, "node_modules/@ecp.eth/react-editor/"),
];

// if (pnpmGlobalPath) {
//   config.watchFolders.push(path.resolve(pnpmGlobalPath, "@ecp.eth/"));
// }

config.watchFolders = watchFolders;

config.resolver = {
  ...config.resolver,
  assetExts: [...config.resolver.assetExts, "css"],
};

module.exports = config;
