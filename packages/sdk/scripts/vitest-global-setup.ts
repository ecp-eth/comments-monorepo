import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import { ANVIL_PORT_FOR_TESTS } from "./constants";

let nodeProcess: ChildProcess;

export async function setup() {
  console.log("🚀 Starting global test setup...");

  const cwd = path.resolve(import.meta.dirname, "../../protocol");

  // Start Anvil node
  console.log("📡 Starting Anvil node...");
  nodeProcess = spawn(
    "pnpm",
    [
      "rivet",
      "anvil",
      "--host",
      "0.0.0.0",
      "--block-time",
      "0.5",
      // let's use a different port for sdk testing so we don't conflict with the main anvil node
      "--port",
      ANVIL_PORT_FOR_TESTS.toString(),
    ],
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
        if (output.includes(`Listening on 0.0.0.0:${ANVIL_PORT_FOR_TESTS}`)) {
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

  console.log("🔄 Verifying Anvil connection...");
  await verifyAnvilConnection();
  console.log("✅ Anvil connection verified");
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

async function verifyAnvilConnection() {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const response = await fetch(`http://localhost:${ANVIL_PORT_FOR_TESTS}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_blockNumber",
          params: [],
          id: 1,
        }),
        signal: AbortSignal.timeout(1000),
      });

      if (response.ok) {
        console.log("✅ Anvil connection verified");
        return;
      }
    } catch (error) {
      console.log(`🔄 Connection attempt ${retries + 1} failed, retrying...`);
      console.error(error);
    }

    retries++;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error("Failed to connect to Anvil after multiple attempts");
}
