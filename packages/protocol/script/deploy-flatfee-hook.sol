// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Script, console } from "forge-std/Script.sol";

import { FlatFeeHook } from "../test/FlatFeeHook.t.sol";

contract DeployFlatFeeHook is Script {
  FlatFeeHook public flatFeeHook;

  function setUp() public {}

  function run() public {
    uint256 salt = uint256(0);
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    address deployerAddress = vm.addr(deployerPrivateKey);

    vm.startBroadcast(deployerPrivateKey);

    flatFeeHook = new FlatFeeHook{ salt: bytes32(salt) }(deployerAddress);
    flatFeeHook.setShouldChargeOnEdit(true);

    // Log the address of the deployed contract
    console.log("FlatFeeHook deployed at:", address(flatFeeHook));

    // Stop the broadcast
    vm.stopBroadcast();
  }
}
