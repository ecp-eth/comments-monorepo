// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {YoinkProtocol} from "../src/YoinkProtocol.sol";
import {BatchCallDelegation} from "../src/BatchCallDelegationProtocol.sol";

contract DevScript is Script {
    YoinkProtocol public yoinkProtocol;
    BatchCallDelegation public batchCallDelegationProtocol;

    function setUp() public {}

    function run() public {
        // Anvil test account private key
        uint256 deployerPrivateKey = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
        vm.startBroadcast(deployerPrivateKey);

        // Deploy contract
        yoinkProtocol = new YoinkProtocol();
        batchCallDelegationProtocol = new BatchCallDelegation();

        console.log("YoinkProtocol deployed at", address(yoinkProtocol));
        console.log("BatchCallDelegation deployed at", address(batchCallDelegationProtocol));

        vm.stopBroadcast();
    }
}
