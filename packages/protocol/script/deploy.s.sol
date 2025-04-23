// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {CommentsV1} from "../src/CommentsV1.sol";
import {ChannelManager} from "../src/ChannelManager.sol";
import {NoopHook} from "../src/hooks/NoopHook.sol";

contract DeployScript is Script {
    enum Env {
        Dev,
        Prod
    }

    CommentsV1 public comments;
    ChannelManager public channelManager;
    NoopHook public noopHook;

    function setUp() public {}

    function run(string calldata envInput) public {
        Env env = getEnv(envInput);

        address ownerAddress = vm.envAddress("CONTRACT_OWNER_ADDRESS");
        uint256 deployerPrivateKey = env == Env.Prod
            ? vm.envUint("PRIVATE_KEY") // Anvil test account private key
            : 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

        // by default, foundry runs the script with address 0x1804c8ab1f12e6bbf3894d4083f33e07309d1f38
        // (although this can be changed by setting --private-key or --sender)
        // that means `msg.sender` with this in `run()` script function is not the same as the deployer address
        // we need to set the contract owners to the deployer address initially so that we can call `ownerOnly` functions
        address deployerAddress = vm.addr(deployerPrivateKey);
        console.log("Deployer address:", deployerAddress);

        vm.startBroadcast(deployerPrivateKey);

        if (env == Env.Dev) {
            // Fund wallet with real identity for testing
            address fundAddress = vm.envAddress("FUND_ADDRESS");
            payable(fundAddress).transfer(1 ether);

            // Deploy NoopHook
            noopHook = new NoopHook();

            console.log("NoopHook deployed at", address(noopHook));
        }

        // Deploy CommentsV1 first
        comments = new CommentsV1{salt: bytes32(uint256(0))}(deployerAddress);

        // Deploy ChannelManager with CommentsV1 address
        channelManager = new ChannelManager{salt: bytes32(uint256(0))}(
            deployerAddress
        );

        // Update contract addresses
        channelManager.updateCommentsContract(address(comments));
        comments.updateChannelContract(address(channelManager));

        // Set contract owners
        channelManager.transferOwnership(ownerAddress);
        comments.transferOwnership(ownerAddress);

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
