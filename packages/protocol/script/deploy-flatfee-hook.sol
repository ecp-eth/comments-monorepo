// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Script, console } from "forge-std/Script.sol";

import { FlatFeeHook } from "../test/FlatFeeHook.t.sol";
import { FlatERC20FeeHook, DummyERC20 } from "../test/FlatERC20FeeHook.t.sol";

contract DeployFlatFeeHook is Script {
  FlatFeeHook public flatFeeHook;
  DummyERC20 public dummyERC20;
  FlatERC20FeeHook public flatERC20FeeHook;

  function setUp() public {}

  function run() public {
    uint256 salt = uint256(0);
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    address deployerAddress = vm.addr(deployerPrivateKey);

    vm.startBroadcast(deployerPrivateKey);

    flatFeeHook = new FlatFeeHook{ salt: bytes32(salt) }(deployerAddress);
    flatFeeHook.setShouldChargeOnEdit(true);

    // Deploy DummyERC20 with:
    // - Name: "Dummy Token"
    // - Symbol: "DUMMY"
    dummyERC20 = new DummyERC20{ salt: bytes32(salt) }(
      "Dummy Token",
      "DUMMY",
      deployerAddress
    );

    address fundAddress = vm.envAddress("FUND_ADDRESS");
    dummyERC20.mint(fundAddress, 64 * 10 ** 18); // 64 tokens

    flatERC20FeeHook = new FlatERC20FeeHook{ salt: bytes32(salt) }(
      deployerAddress,
      address(dummyERC20)
    );

    // Log the address of the deployed contract
    console.log("DummyERC20 deployed at:", address(dummyERC20));
    console.log("FlatFeeHook deployed at:", address(flatFeeHook));
    console.log("FlatERC20FeeHook deployed at:", address(flatERC20FeeHook));
    // Stop the broadcast
    vm.stopBroadcast();
  }
}
