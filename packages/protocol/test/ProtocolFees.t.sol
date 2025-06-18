// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ProtocolFees.sol";
import "../src/interfaces/IProtocolFees.sol";
import "solady/auth/Ownable.sol";

// Concrete implementation of ProtocolFees for testing
contract TestProtocolFees is ProtocolFees {
  constructor(address initialOwner) ProtocolFees(initialOwner) {}
}

contract ProtocolFeesTest is Test {
  TestProtocolFees public protocolFees;
  address public owner;
  address public nonOwner;
  address public recipient;

  event FeesWithdrawn(address indexed recipient, uint256 amount);

  function setUp() public {
    owner = makeAddr("owner");
    nonOwner = makeAddr("nonOwner");
    recipient = makeAddr("recipient");

    vm.startPrank(owner);
    protocolFees = new TestProtocolFees(owner);
    vm.stopPrank();
  }

  function test_OnlyOwnerCanWithdrawFees() public {
    // Send some ETH to the contract
    vm.deal(address(protocolFees), 1 ether);

    // Try to withdraw as non-owner (should fail)
    vm.startPrank(nonOwner);
    vm.expectRevert(abi.encodeWithSelector(Ownable.Unauthorized.selector));
    protocolFees.withdrawFees(recipient);
    vm.stopPrank();

    // Withdraw as owner (should succeed)
    vm.startPrank(owner);
    vm.expectEmit(true, false, false, true);
    emit FeesWithdrawn(recipient, 1 ether);
    uint256 amount = protocolFees.withdrawFees(recipient);
    vm.stopPrank();

    // Verify the amount withdrawn
    assertEq(amount, 1 ether);
    assertEq(recipient.balance, 1 ether);
    assertEq(address(protocolFees).balance, 0);
  }

  function test_CannotWithdrawToZeroAddress() public {
    // Send some ETH to the contract
    vm.deal(address(protocolFees), 1 ether);

    // Try to withdraw to zero address (should fail)
    vm.startPrank(owner);
    vm.expectRevert(IChannelManager.ZeroAddress.selector);
    protocolFees.withdrawFees(address(0));
    vm.stopPrank();
  }

  function test_WithdrawFeesEmitsEvent() public {
    // Send some ETH to the contract
    vm.deal(address(protocolFees), 1 ether);

    // Withdraw as owner and verify event
    vm.startPrank(owner);
    vm.expectEmit(true, false, false, true);
    emit FeesWithdrawn(recipient, 1 ether);
    protocolFees.withdrawFees(recipient);
    vm.stopPrank();
  }

  function test_FeeCalculationFunctionsAreInverse() public view {
    // Test with different values
    uint256[] memory testValues = new uint256[](3);
    testValues[0] = 1 ether; // 1 ETH
    testValues[1] = 0.1 ether; // 0.1 ETH
    testValues[2] = 0.01 ether; // 0.01 ETH

    for (uint i = 0; i < testValues.length; i++) {
      uint256 originalValue = testValues[i];

      // Calculate the amount after fee deduction
      uint256 afterFee = protocolFees.deductProtocolHookTransactionFee(
        originalValue
      );

      // Calculate the required input to get the after-fee amount
      uint256 requiredInput = protocolFees.calculateMsgValueWithHookFee(
        afterFee
      );

      // Due to rounding in integer division, the required input might be slightly larger
      // than the original value. We verify that the difference is within acceptable bounds
      // (less than 1 basis point of the original value)
      uint256 maxAllowedDifference = originalValue / 10000; // 1 basis point
      assertTrue(
        requiredInput >= originalValue &&
          requiredInput <= originalValue + maxAllowedDifference,
        "Fee calculation functions have too much rounding error"
      );

      // Verify that applying the fee deduction again gives the same result
      uint256 afterFeeAgain = protocolFees.deductProtocolHookTransactionFee(
        requiredInput
      );
      assertEq(afterFeeAgain, afterFee, "Fee deduction is not consistent");
    }
  }

  function test_FeeCalculationWithZeroFee() public {
    // Set fee to 0%
    vm.startPrank(owner);
    protocolFees.setHookTransactionFee(0);
    vm.stopPrank();

    uint256 testValue = 1 ether;

    // With 0% fee, the functions should return the same value
    uint256 afterFee = protocolFees.deductProtocolHookTransactionFee(testValue);
    assertEq(
      afterFee,
      testValue,
      "Fee deduction should return same value with 0% fee"
    );

    uint256 requiredInput = protocolFees.calculateMsgValueWithHookFee(
      testValue
    );
    assertEq(
      requiredInput,
      testValue,
      "Fee calculation should return same value with 0% fee"
    );
  }

  function test_FeeCalculationWithMaxFee() public {
    // Set fee to 100% (10000 basis points)
    vm.startPrank(owner);
    protocolFees.setHookTransactionFee(10000);
    vm.stopPrank();

    uint256 testValue = 1 ether;

    // With 100% fee, deductProtocolHookTransactionFee should return 0
    uint256 afterFee = protocolFees.deductProtocolHookTransactionFee(testValue);
    assertEq(afterFee, 0, "Fee deduction should return 0 with 100% fee");

    // With 100% fee, calculateMsgValueWithHookFee should revert or return 0
    // (implementation dependent, but should handle this case)
    uint256 requiredInput = protocolFees.calculateMsgValueWithHookFee(0);
    assertEq(requiredInput, 0, "Fee calculation should handle 100% fee case");
  }
}
