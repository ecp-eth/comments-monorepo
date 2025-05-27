// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script, console } from "forge-std/Script.sol";
import { ChannelManager } from "@ecp.eth/protocol/src/ChannelManager.sol";
import { BaseHook } from "@ecp.eth/protocol/src/hooks/BaseHook.sol";

contract CreateChannelScript is Script {
  function run() external {
    // Get the private key from environment
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

    // Get the channel manager address
    address channelManagerAddress = vm.envAddress("CHANNEL_MANAGER_ADDRESS");

    vm.startBroadcast(deployerPrivateKey);

    ChannelManager channelManager = ChannelManager(channelManagerAddress);

    // Get the channel creation fee
    uint256 fee = channelManager.getChannelCreationFee();
    console.log("Channel creation fee:", fee);

    // Create a new channel
    uint256 channelId = channelManager.createChannel{ value: fee }(
      "Ethereum Comments Protocol Updates",
      "Latest updates and announcements from the Ethereum Comments Protocol",
      "",
      address(0)
    );

    console.log("Channel created with ID:", channelId);

    vm.stopBroadcast();
  }
}
