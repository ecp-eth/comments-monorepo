import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { format } from "prettier";

const currentDir = import.meta.dirname;
const outputAbiPath = resolve(
  currentDir,
  "../../packages/sdk/src/abis.ts"
);

const abi = execFileSync(
  "pnpm",
  ["forge", "inspect", "./src/CommentsV1.sol:CommentsV1", "abi"],
  {
    cwd: currentDir,
    encoding: "utf-8",
  }
);

const formattedAbi = await format(
  `
  /**
   * ABI of the CommentsV1 contract.
   */
  export const CommentsV1Abi = ${abi.trim()} as const;
`,
  { parser: "typescript" }
);

writeFileSync(outputAbiPath, formattedAbi, { encoding: "utf-8" });
