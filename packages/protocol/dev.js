import { exec } from "child_process";

const cwd = import.meta.dirname;
const nodeProcess = exec("anvil --block-time 2", { cwd });

nodeProcess.stdout.on("data", (data) => {
  console.log(data.toString());

  if (data.includes("Listening on 127.0.0.1:8545")) {
    const devProcess = exec(
      "forge script script/Dev.s.sol:DevScript --rpc-url http://localhost:8545 --broadcast",
      { cwd }
    );

    devProcess.on("message", (message) => {
      console.log(message);
    });

    devProcess.on("error", (error) => {
      console.error(error);
    });

    devProcess.on("exit", (code) => {
      if (code !== 0) {
        nodeProcess.kill();
        console.error(
          `Deploying contract exited with code ${code}, anvil terminated`
        );
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
