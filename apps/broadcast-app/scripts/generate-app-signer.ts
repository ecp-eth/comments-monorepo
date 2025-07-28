#!/usr/bin/env node --experimental-strip-types
/**
 * This script generates a private key for the app signer.
 *
 * Usage:
 *
 * ```
 * ./generate-app-signer.ts
 * ```
 */
import { generatePrivateKey } from "viem/accounts";

const privateKey = generatePrivateKey();

console.log("Private key: ", privateKey);
process.exit(0);
