import { run } from "node:test";
import { spec } from "node:test/reporters";
import process from "node:process";
import path from "node:path";
import { type ChildProcess, spawn } from "node:child_process";

const wantsWatchMode = process.argv.includes("--watch");

const cwd = path.resolve(import.meta.dirname, "../../protocol");

const nodeProcess = spawn("anvil", ["--host", "0.0.0.0", "--block-time", "1"], {
  cwd,
  env: process.env,
});
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
function killProcess(childProcess: ChildProcess) {
  childProcess.unref();

  if (childProcess.killed) {
    return;
  }

  console.log("Killing anvil node");
  childProcess.kill();
}

process.on("beforeExit", () => {
  killProcess(nodeProcess);
});

run({
  watch: wantsWatchMode,
  execArgv: [
    "--experimental-transform-types",
    "--import",
    "./scripts/test-globals.js",
    "--import",
    "node-resolve-ts/register",
  ],
})
  .on("test:fail", () => {
    process.exitCode = 1;
  })
  .on("end", async () => {
    killProcess(nodeProcess);
  })
  .compose(spec)
  .pipe(process.stdout);
