import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import { deployContracts } from "./test-helpers.js";

let nodeProcess: ChildProcess;

export async function setup() {
  console.log("🚀 Starting global test setup...");

  const cwd = path.resolve(import.meta.dirname, "../../protocol");

  // Start Anvil node
  console.log("📡 Starting Anvil node...");
  nodeProcess = spawn(
    "anvil",
    ["--host", "0.0.0.0", "--block-time", "1", "--slots-in-an-epoch", "1"],
    {
      cwd,
      env: process.env,
    },
  );

  const nodeProcessTimeout = AbortSignal.timeout(20_000);

  // Wait for node to start
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
          console.log("✅ Anvil node started");
          resolve(true);
        }
      });

      nodeProcess.stderr?.on("data", (data) => {
        console.error("❌ Anvil error:", data.toString());
        reject(new Error("Anvil node failed to start"));
      });
    }),
    new Promise((_, reject) => {
      nodeProcessTimeout.addEventListener("abort", () => {
        reject(new Error("Anvil node startup timeout"));
      });
    }),
  ]);

  // Clean up listeners
  nodeProcess.stdout?.removeAllListeners();
  nodeProcess.stderr?.removeAllListeners();

  // Deploy contracts
  console.log("📄 Deploying test contracts...");
  try {
    const contractAddresses = deployContracts();
    console.log("✅ Contracts deployed:", contractAddresses);

    // Make contract addresses available globally
    globalThis.__TEST_CONTRACTS__ = contractAddresses;
  } catch (error) {
    console.error("❌ Contract deployment failed:", error);
    throw error;
  }

  console.log("🎉 Global test setup complete!");
}

export async function teardown() {
  console.log("🧹 Starting global test teardown...");

  if (nodeProcess && !nodeProcess.killed) {
    console.log("🔌 Stopping Anvil node...");
    nodeProcess.kill();

    // Wait a bit for graceful shutdown
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (!nodeProcess.killed) {
      nodeProcess.kill("SIGKILL");
    }

    console.log("✅ Anvil node stopped");
  }

  console.log("🏁 Global test teardown complete!");
}
