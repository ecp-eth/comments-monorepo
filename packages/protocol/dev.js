import { exec } from "child_process";

const cwd = import.meta.dirname;
const nodeProcess = exec("anvil --host 0.0.0.0 --block-time 2", { cwd });

nodeProcess.stdout.on("data", (data) => {
  console.log(data.toString());

  if (data.includes("Listening on 0.0.0.0:8545")) {
    const devProcess = exec(
      "forge script script/Dev.s.sol:DevScript --rpc-url http://localhost:8545 --broadcast",
      { cwd },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing dev script: ${error.message}`);
          process.exit(1);
        }
        console.log(stdout);
        console.error(stderr);
      }
    );

    devProcess.on("exit", (code) => {
      if (code !== 0) {
        console.error(`Deploying contract exited with code ${code}`);
        process.exit(1);
      }
    });
  }
});

nodeProcess.stderr.on("data", (data) => {
  console.error(data.toString());
});

nodeProcess.on("exit", (code) => {
  console.log(`Anvil server exited with code ${code}`);
  process.exit(code);
});

const handleTermination = (signal) => {
  console.log("Termination signal received. Terminating node process...");
  nodeProcess.kill(signal);
};

process.on("SIGINT", handleTermination);
process.on("SIGTERM", handleTermination);
