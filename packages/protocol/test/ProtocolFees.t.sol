// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ProtocolFees.sol";
import "../src/interfaces/IProtocolFees.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


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
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, nonOwner));
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
} 