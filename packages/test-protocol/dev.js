import { spawn } from "child_process";

const cwd = import.meta.dirname;

// wait for anvil from protocol package to start
const timeout = 500;
let retries = 0;

while (retries < 100) {
  try {
    await fetch("http://localhost:8545", {
      signal: AbortSignal.timeout(1000),
    });

    console.log("Anvil is ready");
    break; // go to next step
  } catch (e) {
    console.log("Anvil is not ready yet", e);
  }

  await new Promise((resolve) => setTimeout(resolve, timeout));
  retries++;
}

console.log("Deploying contract to anvil...");

const script = spawn(
  "forge",
  [
    "script",
    "script/dev.s.sol:DevScript",
    "--rpc-url",
    "http://localhost:8545",
    "--broadcast",
  ],
  { cwd, stdio: "inherit" }
);

script.on("exit", (code) => {
  if (code != 0) {
    console.error(`Error executing dev script: ${code}`);
    process.exit(1);
  }

  process.exit(0);
});
