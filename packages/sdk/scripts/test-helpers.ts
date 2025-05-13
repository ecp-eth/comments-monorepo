import { exec, execSync } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
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

  return extractContractAddresses(deployProcessOutput, true);
}

export async function deployContractsAsync(deployEnv: "test" | "dev"): Promise<{
  commentsAddress: Hex;
  channelManagerAddress: Hex;
  noopHookAddress: Hex;
}> {
  const deployProcessRawOutput = await promisify(exec)(
    "pnpm run deploy:" + deployEnv,
    {
      cwd,
      env: process.env,
    }
  );

  return extractContractAddresses(
    deployProcessRawOutput.stdout,
    deployEnv === "test"
  );
}

export function extractContractAddresses(output: string, hasNoopHook: boolean) {
  console.log("deploy output", output);
  const commentsAddress = output.match(
    /CommentManager deployed at (0x[a-fA-F0-9]{40})/
  )?.[1];
  const channelManagerAddress = output.match(
    /ChannelManager deployed at (0x[a-fA-F0-9]{40})/
  )?.[1];
  const noopHookAddress = output.match(
    /NoopHook deployed at (0x[a-fA-F0-9]{40})/
  )?.[1];

  if (
    !commentsAddress ||
    !channelManagerAddress ||
    (hasNoopHook && !noopHookAddress)
  ) {
    throw new Error("Failed to extract contract addresses");
  }

  return {
    commentsAddress: commentsAddress as Hex,
    channelManagerAddress: channelManagerAddress as Hex,
    noopHookAddress: noopHookAddress as Hex,
  };
}
