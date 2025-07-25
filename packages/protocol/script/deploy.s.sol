// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Script, console } from "forge-std/Script.sol";
import { Vm } from "forge-std/Vm.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { NoopHook } from "../src/hooks/NoopHook.sol";

contract DeployScript is Script {
  enum Env {
    Dev,
    Prod,
    Test
  }

  CommentManager public comments;
  ChannelManager public channelManager;
  NoopHook public noopHook;
  address public deployerAddress;
  bool public isSimulation;
  address public ownerAddress;
  Env public env;

  function setUp() public {}

  function run(string calldata envInput) public {
    uint256 fallbackPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    env = getEnv(envInput);

    isSimulation = vm.envOr("SIM", false);
    ownerAddress = vm.envAddress("CONTRACT_OWNER_ADDRESS");

    uint256 deployerPrivateKey = env == Env.Prod
      ? vm.envOr("PRIVATE_KEY", uint256(fallbackPrivateKey))
      : fallbackPrivateKey; // Anvil test account private key
    address deployerAddressFromPrivateKey = vm.addr(deployerPrivateKey);
    deployerAddress = vm.envOr(
      "PROD_DEPLOYER_ADDRESS",
      deployerAddressFromPrivateKey
    );

    console.log(
      string.concat(isSimulation ? "Simulation " : "", "Deployer Address:"),
      deployerAddress
    );
    console.log(
      "Expected deployer from private key:",
      deployerAddressFromPrivateKey
    );

    // Verify sender configuration
    if (!isSimulation && deployerAddress != deployerAddressFromPrivateKey) {
      console.log(
        "WARNING: PROD_DEPLOYER_ADDRESS doesn't match private key address"
      );
      console.log("Using address from private key for broadcast");
      deployerAddress = deployerAddressFromPrivateKey;
    }

    if (isSimulation) {
      vm.startBroadcast(deployerAddress);
      console.log("Is Simulation");
    } else {
      vm.startBroadcast(deployerPrivateKey);
    }

    if (env == Env.Dev) {
      runDevTasks();
    } else if (env == Env.Test) {
      runTestTasks();
    } else if (env == Env.Prod) {
      runProdTasks();
    }

    console.log("Deployment completed successfully");
    console.log("ChannelManager address:", address(channelManager));
    console.log("CommentManager address:", address(comments));

    vm.stopBroadcast();

    if (env == Env.Prod) {
      runProdPostBroadcastTasks();
    }
  }

  // Convert string to enum
  function getEnv(string calldata envInput) private pure returns (Env) {
    Env localEnv;

    if (
      keccak256(abi.encodePacked(envInput)) ==
      keccak256(abi.encodePacked("dev"))
    ) {
      localEnv = Env.Dev;
      console.log("Running with env dev");
    } else if (
      keccak256(abi.encodePacked(envInput)) ==
      keccak256(abi.encodePacked("prod"))
    ) {
      localEnv = Env.Prod;
      console.log("Running with env prod");
    } else if (
      keccak256(abi.encodePacked(envInput)) ==
      keccak256(abi.encodePacked("test"))
    ) {
      localEnv = Env.Test;
      console.log("Running with env test");
    } else {
      revert("Invalid env. Use 'dev' or 'prod' or 'test'");
    }

    return localEnv;
  }

  function runDevTasks() private {
    uint256 salt = uint256(0);
    fundWallet();
    deployContracts(salt);
    setupContracts();
    transferOwnership();
  }

  function runTestTasks() private {
    // We deploy the contract in different tests in sdk, so we want to have different addresses
    uint256 salt = uint256(
      bytes32(
        keccak256(
          abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            block.coinbase,
            block.number,
            block.gaslimit,
            block.timestamp
          )
        )
      )
    );

    // Deploy NoopHook

    fundWallet();
    deployContracts(salt);

    noopHook = new NoopHook();
    console.log("NoopHook deployed at", address(noopHook));

    setupContracts();
    transferOwnership();
  }

  function runProdTasks() private {
    uint256 salt = uint256(0);
    deployContracts(salt);
    setupContracts();
    transferOwnership();
  }

  function runProdPostBroadcastTasks() private {
    verifyContract();
  }

  function fundWallet() private {
    console.log("Funding wallet with test ether... (for testing)");
    address fundAddress = vm.envAddress("FUND_ADDRESS");
    payable(fundAddress).transfer(1 ether);
  }

  function deployContracts(uint256 salt) private {
    console.log("Deploying contracts...");
    // Deploy CommentManager first
    // by default, foundry runs the script with address 0x1804c8ab1f12e6bbf3894d4083f33e07309d1f38
    // (although this can be changed by setting --private-key or --sender)
    // that means `msg.sender` with this in `run()` script function is not the same as the deployer address
    // we need to set the contract owners to the deployer address initially so we can call `ownerOnly` functions
    try new CommentManager{ salt: bytes32(salt) }(deployerAddress) returns (
      CommentManager _comments
    ) {
      comments = _comments;
      console.log("CommentManager deployed at", address(comments));
    } catch Error(string memory reason) {
      console.log("CommentManager deployment failed:", reason);
      revert("CommentManager deployment failed");
    }
    // Deploy ChannelManager with CommentManager address
    try new ChannelManager{ salt: bytes32(salt) }(deployerAddress) returns (
      ChannelManager _channelManager
    ) {
      channelManager = _channelManager;
      console.log("ChannelManager deployed at", address(channelManager));
    } catch Error(string memory reason) {
      console.log("ChannelManager deployment failed:", reason);
      revert("ChannelManager deployment failed");
    }
  }

  function setupContracts() private {
    if (isSimulation) {
      return;
    }
    console.log("Setting up contracts...");
    try comments.updateChannelContract(address(channelManager)) {
      console.log("CommentManager channel contract updated successfully");
    } catch Error(string memory reason) {
      console.log("Failed to update CommentManager channel contract:", reason);
      revert("Contract configuration failed");
    }
    string memory baseUri;

    if (env == Env.Prod) {
      string memory chainId = getChainId();
      string memory baseUriOrigin = vm.envOr(
        "NFT_BASE_URI",
        string("https://nft.ethcomments.xyz")
      );
      baseUri = string.concat(baseUriOrigin, "/chain/", chainId, "/");
    } else {
      // Set base uri to the nft-base-uri-server
      baseUri = "http://localhost:3007/chain/31337/";
    }

    try channelManager.setBaseURI(baseUri) {
      console.log("ChannelManager baseURI set to", baseUri);
    } catch Error(string memory reason) {
      console.log("Failed to set ChannelManager baseURI:", reason);
      revert("BaseURI configuration failed");
    }
  }

  function transferOwnership() private {
    console.log("Transferring ownership...");
    try channelManager.transferOwnership(ownerAddress) {
      console.log("ChannelManager ownership transferred successfully");
    } catch Error(string memory reason) {
      console.log("Failed to transfer ChannelManager ownership:", reason);
      revert("Ownership transfer failed");
    }
    try comments.transferOwnership(ownerAddress) {
      console.log("CommentManager ownership transferred successfully");
    } catch Error(string memory reason) {
      console.log("Failed to transfer CommentManager ownership:", reason);
      revert("Ownership transfer failed");
    }
  }

  function verifyContract() private {
    if (isSimulation) {
      return;
    }

    console.log("Verifying contracts...");

    // Verify ChannelManager
    executeForgeVerifyContract(
      address(channelManager),
      "ChannelManager",
      "src/ChannelManager.sol"
    );

    // Verify CommentManager
    executeForgeVerifyContract(
      address(comments),
      "CommentManager",
      "src/CommentManager.sol"
    );

    console.log(
      "\x1b[33m%s\x1b[0m",
      "Remember to update `packages/sdk/src/embed/schemas/index.ts` to include new chain into SDK."
    );
  }

  function executeForgeVerifyContract(
    address contractAddress,
    string memory contractName,
    string memory contractPath
  ) private {
    string memory chainId = getChainId();
    string memory etherscanApiKey = vm.envOr("ETHERSCAN_API_KEY", string(""));
    string memory verifierUrl = vm.envOr("VERIFIER_URL", string(""));
    // ABI-encode the constructor arguments using Solidity's built-in function
    bytes memory encodedArgs = abi.encode(deployerAddress);
    string memory encodedArgsStr = vm.toString(encodedArgs);

    console.log(
      "verifying %s at %s on chain id %s ...",
      contractName,
      contractAddress,
      chainId
    );

    string[] memory cmd = new string[](16);
    cmd[0] = "forge";
    cmd[1] = "verify-contract";
    cmd[2] = vm.toString(address(contractAddress));
    cmd[3] = string.concat(contractPath, ":", contractName);
    cmd[4] = "--chain-id";
    cmd[5] = chainId;
    cmd[6] = "--etherscan-api-key";
    cmd[7] = etherscanApiKey;
    cmd[8] = "--verifier-url";
    cmd[9] = verifierUrl;
    cmd[10] = "--constructor-args";
    cmd[11] = encodedArgsStr;
    cmd[12] = "--delay";
    cmd[13] = "5";
    cmd[14] = "--retries";
    cmd[15] = "5";

    // vm.ffi does not throw when exit code is non-zero https://github.com/foundry-rs/foundry/pull/5660/files
    try vm.tryFfi(cmd) returns (Vm.FfiResult memory f) {
      if (f.exitCode == 0) {
        console.log(contractName, "verified successfully");
        console.log("Verification result:", string(f.stdout));
      } else {
        console.log(
          "\x1b[33m%s %s %s\x1b[0m",
          contractName,
          "verification failed:",
          string(f.stderr)
        );
      }
    } catch Error(string memory reason) {
      console.log(
        "\x1b[33m%s %s %s\x1b[0m",
        contractName,
        "verification failed:",
        reason
      );
    } catch {
      console.log(
        "\x1b[33m%s %s %s\x1b[0m",
        contractName,
        "verification failed with unknown error"
      );
    }
  }

  function getChainId() private view returns (string memory) {
    return vm.envOr("CHAIN_ID", string("1"));
  }
}
