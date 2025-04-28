import { execSync } from "node:child_process";
import path from "node:path";
import type { Hex } from "viem";

const cwd = path.resolve(import.meta.dirname, "../../protocol");

export function deployContracts(): {
  commentsAddress: Hex;
  channelManagerAddress: Hex;
  noopHookAddress: Hex;
} {
  const deployProcessRawOutput = execSync("pnpm run deploy:test", {
    cwd,
    env: process.env,
  });
  const deployProcessOutput = deployProcessRawOutput.toString();

  const commentsAddress = deployProcessOutput.match(
    /CommentsV1 deployed at (0x[a-fA-F0-9]{40})/
  )?.[1];
  const channelManagerAddress = deployProcessOutput.match(
    /ChannelManager deployed at (0x[a-fA-F0-9]{40})/
  )?.[1];
  const noopHookAddress = deployProcessOutput.match(
    /NoopHook deployed at (0x[a-fA-F0-9]{40})/
  )?.[1];

  if (!commentsAddress || !channelManagerAddress || !noopHookAddress) {
    throw new Error("Failed to deploy contracts");
  }

  return {
    commentsAddress: commentsAddress as Hex,
    channelManagerAddress: channelManagerAddress as Hex,
    noopHookAddress: noopHookAddress as Hex,
  };
}
