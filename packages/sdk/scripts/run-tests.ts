import { run } from "node:test";
import { spec } from "node:test/reporters";
import process from "node:process";
import path from "node:path";
import { exec } from "node:child_process";

const wantsWatchMode = process.argv.includes("--watch");

const cwd = path.resolve(import.meta.dirname, "../../protocol");

const nodeProcess = exec("anvil --host 0.0.0.0 --block-time 1", { cwd });
const nodeProcessTimeout = AbortSignal.timeout(20_000);

// wait for nodeProcess to output Listening on 0.0.0.0:8545 in stdout
await Promise.race([
  new Promise((resolve, reject) => {
    nodeProcess.stdout?.on("data", (data) => {
      if (data.toString().includes("Listening on 0.0.0.0:8545")) {
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

// deploy the contracts
const deployProcess = exec("pnpm run deploy:dev", { cwd });

await new Promise((resolve, reject) => {
  deployProcess.on("exit", (code) => {
    if (code !== 0) {
      console.error(`Deploying contract exited with code ${code}`);
      reject(new Error(`Deploying contract exited with code ${code}`));
    } else {
      console.log("Contracts deployed");
      resolve(true);
    }
  });
});

process.on("beforeExit", () => {
  if (!nodeProcess.killed) {
    console.log("Killing anvil node");
    nodeProcess.kill();
  }
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
  .on("end", () => {
    if (!nodeProcess.killed) {
      console.log("Killing anvil node");
      nodeProcess.kill();
    }
  })
  .compose(spec)
  .pipe(process.stdout);
