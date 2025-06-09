// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Script, console } from "forge-std/Script.sol";
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

  function setUp() public {}

  function run(string calldata envInput) public {
    uint256 fallbackPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    Env env = getEnv(envInput);
    uint256 salt = uint256(0);

    bool isSimulation = vm.envOr("SIM", false);

    address ownerAddress = vm.envAddress("CONTRACT_OWNER_ADDRESS");
    uint256 deployerPrivateKey = env == Env.Prod
      ? vm.envOr("PRIVATE_KEY", uint256(fallbackPrivateKey))
      : fallbackPrivateKey; // Anvil test account private key
    address deployerAddressFromPrivateKey = vm.addr(deployerPrivateKey);
    address deployerAddress = vm.envOr(
      "PROD_DEPLOYER_ADDRESS",
      deployerAddressFromPrivateKey
    );

    console.log(
      string.concat(isSimulation ? "Simulation " : "", "Deployer Address:"),
      deployerAddress
    );

    if (isSimulation) {
      vm.startBroadcast(deployerAddress);
    } else {
      vm.startBroadcast(deployerPrivateKey);
    }

    if (env == Env.Dev || env == Env.Test) {
      // Fund wallet with real identity for testing
      address fundAddress = vm.envAddress("FUND_ADDRESS");
      payable(fundAddress).transfer(1 ether);
    }

    if (env == Env.Test) {
      // We deploy the contract in different tests in sdk, so we want to have different addresses
      salt = uint256(
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
      noopHook = new NoopHook();

      console.log("NoopHook deployed at", address(noopHook));
    }

    // Deploy CommentManager first
    // by default, foundry runs the script with address 0x1804c8ab1f12e6bbf3894d4083f33e07309d1f38
    // (although this can be changed by setting --private-key or --sender)
    // that means `msg.sender` with this in `run()` script function is not the same as the deployer address
    // we need to set the contract owners to the deployer address initially so we can call `ownerOnly` functions
    comments = new CommentManager{ salt: bytes32(salt) }(deployerAddress);

    // Deploy ChannelManager with CommentManager address
    channelManager = new ChannelManager{ salt: bytes32(salt) }(deployerAddress);

    if (!isSimulation) {
      // Update contract addresses
      channelManager.updateCommentsContract(address(comments));
      comments.updateChannelContract(address(channelManager));

      // Set contract owners
      channelManager.transferOwnership(ownerAddress);
      comments.transferOwnership(ownerAddress);

      if (env == Env.Prod) {
        string memory chainId = vm.envOr("CHAIN_ID", string("1"));
        string memory etherscanApiKey = vm.envOr(
          "ETHERSCAN_API_KEY",
          string("")
        );
        string memory verifierUrl = vm.envOr("VERIFIER_URL", string(""));

        // Verify contracts
        string[] memory channelManagerCmd = new string[](3);
        channelManagerCmd[0] = "forge";
        channelManagerCmd[1] = "verify-contract";
        channelManagerCmd[2] = string.concat(
          vm.toString(address(channelManager)),
          " src/ChannelManager.sol:ChannelManager --chain-id ",
          chainId,
          " --etherscan-api-key ",
          etherscanApiKey,
          " --verifier-url ",
          verifierUrl,
          ' --constructor-args $(cast abi-encode "constructor(address)" ',
          vm.toString(deployerAddress),
          ")"
        );

        string[] memory commentManagerCmd = new string[](3);
        commentManagerCmd[0] = "forge";
        commentManagerCmd[1] = "verify-contract";
        commentManagerCmd[2] = string.concat(
          vm.toString(address(comments)),
          " src/CommentManager.sol:CommentManager --chain-id ",
          chainId,
          " --etherscan-api-key ",
          etherscanApiKey,
          " --verifier-url ",
          verifierUrl,
          ' --constructor-args $(cast abi-encode "constructor(address)" ',
          vm.toString(deployerAddress),
          ")"
        );

        vm.ffi(channelManagerCmd);
        console.log("ChannelManager verified successfully");

        vm.ffi(commentManagerCmd);
        console.log("CommentManager verified successfully");
      }
    }

    console.log("ChannelManager deployed at", address(channelManager));
    console.log("CommentManager deployed at", address(comments));

    vm.stopBroadcast();
  }

  function getEnv(string calldata envInput) private pure returns (Env) {
    // Convert string to enum
    Env env;

    if (
      keccak256(abi.encodePacked(envInput)) ==
      keccak256(abi.encodePacked("dev"))
    ) {
      env = Env.Dev;
    } else if (
      keccak256(abi.encodePacked(envInput)) ==
      keccak256(abi.encodePacked("prod"))
    ) {
      env = Env.Prod;
    } else if (
      keccak256(abi.encodePacked(envInput)) ==
      keccak256(abi.encodePacked("test"))
    ) {
      env = Env.Test;
    } else {
      revert("Invalid env. Use 'dev' or 'prod' or 'test'");
    }

    return env;
  }
}
