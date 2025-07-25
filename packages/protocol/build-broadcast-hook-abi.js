import { execFileSync } from "node:child_process";
import { format } from "prettier";

const currentDir = import.meta.dirname;

const broadcastHookAbi = execFileSync(
  "pnpm",
  [
    "forge",
    "inspect",
    "./src/BroadcastHook.sol:BroadcastHook",
    "abi",
    "--json",
  ],
  {
    cwd: currentDir,
    encoding: "utf-8",
  },
);

const formattedAbi = await format(
  `
  /**
   * ABI of the BroadcastHook contract.
   */
  export const BroadcastHookABI = ${broadcastHookAbi.trim()} as const;
`,
  { parser: "typescript" },
);

process.stdout.write(formattedAbi);
