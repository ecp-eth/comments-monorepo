/* eslint-disable @typescript-eslint/no-require-imports */
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// somehow expo 0.53 preview 7 by default enables the unstable features 🤦
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
