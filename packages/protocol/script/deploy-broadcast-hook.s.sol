// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Script, console } from "forge-std/Script.sol";

import { BroadcastHook } from "../src/hooks/BroadcastHook.sol";

contract DeployBroadcastHook is Script {
  BroadcastHook public broadcastHook;

  function setUp() public {}

  function run() public {
    // Load the deployer private key from environment variables
    uint256 deployerPrivateKey = vm.envUint(
      "BROADCAST_HOOK_DEPLOYER_PRIVATE_KEY"
    );
    address deployerAddress = vm.addr(deployerPrivateKey);

    // Load the channel manager address from environment variables
    address channelManager = vm.envAddress(
      "BROADCAST_HOOK_CHANNEL_MANAGER_ADDRESS"
    );

    // Start the broadcast with the deployer's private key
    vm.startBroadcast(deployerPrivateKey);

    broadcastHook = new BroadcastHook(channelManager);

    // Log the address of the deployed contract
    console.log("BroadcastHook deployed at:", address(broadcastHook));

    // Whitelist the deployer address in the BroadcastHook
    // This is necessary to allow the deployer to call the contract functions
    broadcastHook.setWhitelistStatus(deployerAddress, true);

    console.log("Whitelisted deployer address:", deployerAddress);

    // Stop the broadcast
    vm.stopBroadcast();
  }
}
