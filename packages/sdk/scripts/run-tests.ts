import { run } from "node:test";
import { spec } from "node:test/reporters";
import process from "node:process";
import path from "node:path";
import { type ChildProcess, exec } from "node:child_process";

const wantsWatchMode = process.argv.includes("--watch");

const cwd = path.resolve(import.meta.dirname, "../../protocol");

const nodeProcess = exec("anvil --host 0.0.0.0 --block-time 1", { cwd });
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

// Add robust process termination handler
const killProcess = async (process: ChildProcess) => {
  if (process.killed) {
    return;
  }

  console.log("Killing anvil node");

  // First try SIGTERM
  process.kill("SIGTERM");

  // Wait for process to exit with a timeout
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log(
        "Process did not exit with SIGTERM, forcing kill with SIGKILL"
      );
      process.kill("SIGKILL");
      resolve(true);
    }, 2000); // Reduced timeout to 2 seconds

    process.once("exit", () => {
      clearTimeout(timeout);
      resolve(true);
    });
  });
};

process.on("beforeExit", () => {
  killProcess(nodeProcess);
});

run({
  watch: wantsWatchMode,
  execArgv: [
    "--experimental-strip-types",
    "--import",
    "node-resolve-ts/register",
  ],
})
  .on("test:fail", () => {
    process.exitCode = 1;
  })
  .on("end", async () => {
    await killProcess(nodeProcess);
  })
  .compose(spec)
  .pipe(process.stdout);
