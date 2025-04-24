import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { format } from "prettier";

const currentDir = import.meta.dirname;
const outputAbiPaths = [resolve(
  currentDir,
  "abis.ts"
), resolve(
  currentDir,
  "../../packages/sdk/src/abis.ts"
)];

const commentV1ABI = execFileSync(
  "pnpm",
  ["forge", "inspect", "./src/CommentsV1.sol:CommentsV1", "abi", "--json"],
  {
    cwd: currentDir,
    encoding: "utf-8",
  }
);

const channelManagerABI = execFileSync(
  "pnpm",
  ["forge", "inspect", "./src/ChannelManager.sol:ChannelManager", "abi", "--json"],
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
  export const CommentsV1Abi = ${commentV1ABI.trim()} as const;

  /**
   * ABI of the ChannelManager contract.
   */
  export const ChannelManagerAbi = ${channelManagerABI.trim()} as const;
`,
  { parser: "typescript" }
);

for (const outputAbiPath of outputAbiPaths) {
  writeFileSync(outputAbiPath, formattedAbi, { encoding: "utf-8" });
}
