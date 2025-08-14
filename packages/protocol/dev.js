import { exec, execSync } from "child_process";

const rpcUrl = process.env.ANVIL_BASE_RPC_URL_FOR_FORK;
const deployerPrivateKey = process.env.CUSTOM_ANVIL_DEPLOYER_PRIVATE_KEY;
const deployerAddress = process.env.CUSTOM_ANVIL_DEPLOYER_ADDRESS;

let forkSettings = undefined;

if (rpcUrl) {
  console.info(`Forking base from ${rpcUrl}`);

  if (!deployerPrivateKey) {
    throw new Error("CUSTOM_ANVIL_DEPLOYER_PRIVATE_KEY is not set");
  }

  if (!deployerAddress) {
    throw new Error("CUSTOM_ANVIL_DEPLOYER_ADDRESS is not set");
  }

  forkSettings = {
    forkUrl: rpcUrl,
    deployerPrivateKey,
    deployerAddress,
  };
}

const cwd = import.meta.dirname;
const nodeProcess = exec(
  `anvil --host 0.0.0.0 --block-time 2 ${forkSettings ? `--fork-url ${forkSettings.forkUrl} --chain-id 31337` : ""}`,
  { cwd },
);

nodeProcess.stdout.on("data", (data) => {
  console.log(data.toString());

  if (data.includes("Listening on 0.0.0.0:8545")) {
    if (forkSettings) {
      // uses one of anvil's default accounts to fund the deployer address
      execSync(
        `cast send ${forkSettings.deployerAddress} --value 100ether --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`,
      );

      console.log("Funded deployer address with 1 ether");
    }

    const devProcess = exec(
      forkSettings ? `pnpm run deploy:dev:fork` : "pnpm run deploy:dev",
      { cwd },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing dev script: ${error.message}`);
          process.exit(1);
        }
        console.log(stdout);
        console.error(stderr);
      },
    );

    devProcess.stdout.on("data", (data) => {
      console.log(data.toString());
    });

    devProcess.stderr.on("data", (data) => {
      console.error(data.toString());
    });

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
