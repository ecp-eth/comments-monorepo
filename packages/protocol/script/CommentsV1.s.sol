// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {CommentsV1} from "../src/CommentsV1.sol";

contract CommentsV1Script is Script {
    CommentsV1 public comments;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        comments = new CommentsV1{salt: bytes32(0)}();

        console.log("CommentsV1 deployed at", address(comments));

        vm.stopBroadcast();
    }
}
