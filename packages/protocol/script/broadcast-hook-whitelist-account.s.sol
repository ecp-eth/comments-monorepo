// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Script, console } from "forge-std/Script.sol";

import { BroadcastHook } from "../src/hooks/BroadcastHook.sol";

contract BroadcastHookWhitelistAccount is Script {
  function setUp() public {}

  function run() public {
    // Load the deployer private key from environment variables
    uint256 deployerPrivateKey = vm.envUint(
      "BROADCAST_HOOK_DEPLOYER_PRIVATE_KEY"
    );

    // Load the broadcast hook address from environment variables
    address broadcastHookAddress = vm.envAddress("BROADCAST_HOOK_ADDRESS");

    // Load the whitelisting address from environment variables
    address whitelistingAddress = vm.envAddress(
      "BROADCAST_HOOK_WHITELISTING_ADDRESS"
    );

    // Start the broadcast with the deployer's private key
    vm.startBroadcast(deployerPrivateKey);

    BroadcastHook(payable(broadcastHookAddress)).setWhitelistStatus(
      whitelistingAddress,
      true
    );

    vm.stopBroadcast();
  }
}
