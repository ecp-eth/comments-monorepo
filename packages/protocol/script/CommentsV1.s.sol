// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {CommentsV1} from "../src/CommentsV1.sol";
import {ChannelManager} from "../src/ChannelManager.sol";

contract CommentsV1Script is Script {
    CommentsV1 public comments;
    ChannelManager public channelManager;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy ChannelManager first
        channelManager = new ChannelManager{salt: bytes32(0)}(msg.sender);
        
        // Deploy CommentsV1 with ChannelManager address
        comments = new CommentsV1{salt: bytes32(0)}(address(channelManager));

        console.log("ChannelManager deployed at", address(channelManager));
        console.log("CommentsV1 deployed at", address(comments));

        vm.stopBroadcast();
    }
}
