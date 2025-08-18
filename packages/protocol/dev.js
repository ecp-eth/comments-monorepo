import { exec, execSync } from "node:child_process";
import path from "node:path";
import { writeFile, readFile, stat } from "node:fs/promises";

async function getLatestBlock(rpcUrl) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_blockNumber",
      params: [],
      id: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get latest block: ${response.status}`);
  }

  const data = await response.json();

  if (!data.result) {
    throw new Error("Failed to get latest block");
  }

  return parseInt(data.result, 16);
}

async function storeForkBlockNumber(blockNumber) {
  // store the block number in .env.local file of both indexers
  const currentDirectory = import.meta.dirname;
  const broadcastAppIndexerDirectory = path.resolve(
    currentDirectory,
    "../../apps/",
    "broadcast-app-indexer",
  );

  const broadcastAppIndexerEnvFile = path.resolve(
    broadcastAppIndexerDirectory,
    ".env.local",
  );

  const broadcastAppIndexerEnvFileExists = await stat(
    broadcastAppIndexerEnvFile,
  )
    .then(() => true)
    .catch(() => false);

  if (broadcastAppIndexerEnvFileExists) {
    const broadcastAppIndexerEnvFileContent = await readFile(
      broadcastAppIndexerEnvFile,
      "utf8",
    );

    let broadcastAppIndexerEnvFileContentWithForkBlockNumber =
      broadcastAppIndexerEnvFileContent;

    if (broadcastAppIndexerEnvFileContent.includes("CHAIN_ANVIL_START_BLOCK")) {
      broadcastAppIndexerEnvFileContentWithForkBlockNumber =
        broadcastAppIndexerEnvFileContent.replace(
          /CHAIN_ANVIL_START_BLOCK=.*/,
          `CHAIN_ANVIL_START_BLOCK=${blockNumber}`,
        );
    } else {
      broadcastAppIndexerEnvFileContentWithForkBlockNumber =
        broadcastAppIndexerEnvFileContent +
        `\nCHAIN_ANVIL_START_BLOCK=${blockNumber}`;
    }

    await writeFile(
      broadcastAppIndexerEnvFile,
      broadcastAppIndexerEnvFileContentWithForkBlockNumber,
    );
  } else {
    await writeFile(
      broadcastAppIndexerEnvFile,
      `CHAIN_ANVIL_START_BLOCK=${blockNumber}`,
    );
  }
}

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

  const forkBlockNumber = await getLatestBlock(rpcUrl);

  await storeForkBlockNumber(forkBlockNumber);

  forkSettings = {
    forkUrl: rpcUrl,
    deployerPrivateKey,
    deployerAddress,
    forkBlockNumber,
  };
}

const cwd = import.meta.dirname;
const nodeProcess = exec(
  `anvil --host 0.0.0.0 --block-time 2 ${forkSettings ? `--fork-url ${forkSettings.forkUrl} --fork-block-number ${forkSettings.forkBlockNumber} --chain-id 31337 --no-rate-limit` : ""}`,
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
