import process from "node:process";
import path from "node:path";
import { spawn } from "node:child_process";
import { COMMENT_MANAGER_ADDRESS, CHANNEL_MANAGER_ADDRESS } from "@ecp.eth/sdk";
import { deployContracts } from "./test-helpers.ts";

async function startAnvil() {
  const cwd = path.resolve(import.meta.dirname, "../../protocol");

  const nodeProcess = spawn(
    "anvil",
    ["--host", "0.0.0.0", "--block-time", "1"],
    {
      cwd,
      env: process.env,
    }
  );
  const nodeProcessTimeout = AbortSignal.timeout(20_000);

  // wait for nodeProcess to output Listening on 0.0.0.0:8545 in stdout
  await Promise.race([
    new Promise((resolve, reject) => {
      nodeProcess.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error("Anvil node failed to start"));
        }
      });

      nodeProcess.stdout?.on("data", (data) => {
        const output = data.toString();

        if (output.includes("Listening on 0.0.0.0:8545")) {
          console.log("Anvil node started");
          resolve(true);
        }
      });

      nodeProcess.stderr?.on("data", (data) => {
        console.error(data.toString());
        reject(new Error("Anvil node failed to start"));
      });
    }),
    new Promise((_, reject) => {
      nodeProcessTimeout.addEventListener("abort", () => {
        reject(new Error("Anvil node failed to start"));
      });
    }),
  ]);

  nodeProcess.stdout?.removeAllListeners();
  nodeProcess.stderr?.removeAllListeners();

  return function killProcess() {
    nodeProcess.unref();

    if (nodeProcess.killed) {
      return;
    }

    console.log("Killing anvil node");
    nodeProcess.kill();
  };
}

async function checkContractAddresses() {
  const killProcess = await startAnvil();
  const deployResult = deployContracts();

  function exit(code: number) {
    killProcess();
    process.exit(code);
  }

  if (
    deployResult.channelManagerAddress !== CHANNEL_MANAGER_ADDRESS ||
    deployResult.commentsAddress !== COMMENT_MANAGER_ADDRESS
  ) {
    console.error(
      `Contract addresses are not up to date:
      - CHANNEL_MANAGER_ADDRESS: Latest address ${deployResult.channelManagerAddress}, current SDK address ${CHANNEL_MANAGER_ADDRESS}
      - COMMENT_MANAGER_ADDRESS: Latest address ${deployResult.commentsAddress}, current SDK address ${COMMENT_MANAGER_ADDRESS}`
    );
    exit(1);
    return;
  }

  exit(0);
}

await checkContractAddresses();
