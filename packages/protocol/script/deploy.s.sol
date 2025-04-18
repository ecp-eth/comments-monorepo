// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {CommentsV1} from "../src/CommentsV1.sol";
import {ChannelManager} from "../src/ChannelManager.sol";

contract DeployScript is Script {
    enum Env {
        Dev,
        Prod
    }

    CommentsV1 public comments;
    ChannelManager public channelManager;

    function setUp() public {}

    function run(string calldata envInput) public {
        Env env = getEnv(envInput);

        uint256 deployerPrivateKey = env == Env.Prod
            ? vm.envUint("PRIVATE_KEY") // Anvil test account private key
            : 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

        vm.startBroadcast(deployerPrivateKey);

        if (env == Env.Dev) {
            // Fund wallet with real identity for testing
            address fundAddress = vm.envAddress("FUND_ADDRESS");
            payable(fundAddress).transfer(1 ether);
        }

        // Deploy CommentsV1 first
        comments = new CommentsV1{salt: bytes32(uint256(0))}(address(0)); // Temporary zero address for channelManager

        // Deploy ChannelManager with CommentsV1 address
        channelManager = new ChannelManager{salt: bytes32(uint256(0))}(
            msg.sender,
            address(comments)
        );

        // Update CommentsV1 with correct ChannelManager address
        comments = new CommentsV1{salt: bytes32(uint256(1))}(
            address(channelManager)
        );

        console.log("ChannelManager deployed at", address(channelManager));
        console.log("CommentsV1 deployed at", address(comments));

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
        } else {
            revert("Invalid env. Use 'dev' or 'prod'");
        }

        return env;
    }
}
