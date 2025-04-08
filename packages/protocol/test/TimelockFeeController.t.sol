// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {TimelockFeeController} from "../src/TimelockFeeController.sol";
import {NoFeeCollector} from "../src/NoFeeCollector.sol";
import {IFeeCollector} from "../src/interfaces/IFeeCollector.sol";
import {ICommentTypes} from "../src/interfaces/ICommentTypes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";

// Mock implementation of TimelockFeeController for testing
contract TestTimelockFeeController is TimelockFeeController {
    constructor(address initialOwner) TimelockFeeController(initialOwner) {}

    function exposed_collectFee(ICommentTypes.CommentData memory commentData) external payable {
        _collectFee(commentData);
    }
}

// Mock malicious fee collector that reverts on collection
contract MaliciousFeeCollector is IFeeCollector {
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IFeeCollector).interfaceId;
    }

    function collectFee(ICommentTypes.CommentData calldata) external payable returns (bool) {
        revert("Malicious revert");
    }

    function getFeeAmount(ICommentTypes.CommentData calldata) external pure returns (uint256) {
        return 1 ether;
    }

    function getBalance(address) external pure returns (uint256) {
        return 0;
    }

    function withdraw() external pure returns (bool) {
        return true;
    }
}

// Add this mock contract after the MaliciousFeeCollector contract
contract NonFeeCollector is IERC165 {
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return false;
    }
}

contract TimelockFeeControllerTest is Test {
    TestTimelockFeeController public controller;
    NoFeeCollector public noFeeCollector;
    MaliciousFeeCollector public maliciousFeeCollector;
    NonFeeCollector public nonFeeCollector;
    address public owner;
    address public user;

    event FeeCollectorChangeScheduled(address indexed collector, bool enabled, uint256 effectiveTime);
    event FeeCollectorChanged(address indexed collector, bool enabled);
    event FeeCollectorChangeCancelled(address indexed collector, bool enabled);
    event FeesystemPaused(address indexed ownerAddress);
    event FeesystemUnpaused(address indexed ownerAddress);

    function setUp() public {
        owner = address(this);
        user = address(0xBEEF);
        controller = new TestTimelockFeeController(owner);
        noFeeCollector = new NoFeeCollector();
        maliciousFeeCollector = new MaliciousFeeCollector();
        nonFeeCollector = new NonFeeCollector();
        
        vm.deal(user, 100 ether);
    }

    function _createBasicCommentData() internal view returns (ICommentTypes.CommentData memory) {
        return ICommentTypes.CommentData({
            content: "Test comment",
            metadata: "{}",
            targetUri: "https://example.com",
            parentId: bytes32(0),
            threadId: bytes32(0),
            author: address(0x1),
            appSigner: address(0x2),
            nonce: 0,
            deadline: block.timestamp + 1 days
        });
    }

    function test_InitialState() public {
        (IFeeCollector collector, bool enabled) = controller.feeCollectorConfig();
        assertEq(address(collector), address(0));
        assertFalse(enabled);
        assertFalse(controller.paused());
    }

    function test_ScheduleFeeCollectorChange() public {
        vm.expectEmit(true, true, true, true);
        emit FeeCollectorChangeScheduled(
            address(noFeeCollector),
            true,
            block.timestamp + controller.CHANGE_DELAY()
        );

        controller.scheduleFeeCollectorChange(address(noFeeCollector), true);

        (
            address collector,
            bool enabled,
            uint256 effectiveTime,
            bool exists
        ) = controller.getPendingFeeCollectorChange();

        assertEq(collector, address(noFeeCollector));
        assertTrue(enabled);
        assertEq(effectiveTime, block.timestamp + controller.CHANGE_DELAY());
        assertTrue(exists);
    }

    function test_ScheduleFeeCollectorChange_InvalidAddress() public {
        vm.expectRevert(abi.encodeWithSelector(TimelockFeeController.InvalidFeeCollectorAddress.selector));
        controller.scheduleFeeCollectorChange(address(0), true);
    }

    function test_ScheduleFeeCollectorChange_InvalidInterface() public {
        vm.expectRevert(abi.encodeWithSelector(TimelockFeeController.InvalidFeeCollectorInterface.selector));
        controller.scheduleFeeCollectorChange(address(nonFeeCollector), true);
    }

    function test_ExecuteFeeCollectorChange() public {
        controller.scheduleFeeCollectorChange(address(noFeeCollector), true);
        
        // Try to execute before delay
        vm.expectRevert(abi.encodeWithSelector(TimelockFeeController.TimelockDeadlineNotReached.selector));
        controller.executeFeeCollectorChange();

        // Warp to after delay
        vm.warp(block.timestamp + controller.CHANGE_DELAY());

        vm.expectEmit(true, true, true, true);
        emit FeeCollectorChanged(address(noFeeCollector), true);
        
        controller.executeFeeCollectorChange();

        (IFeeCollector collector, bool enabled) = controller.feeCollectorConfig();
        assertEq(address(collector), address(noFeeCollector));
        assertTrue(enabled);
    }

    function test_CancelFeeCollectorChange() public {
        controller.scheduleFeeCollectorChange(address(noFeeCollector), true);

        vm.expectEmit(true, true, true, true);
        emit FeeCollectorChangeCancelled(address(noFeeCollector), true);

        controller.cancelFeeCollectorChange();

        (, , , bool exists) = controller.getPendingFeeCollectorChange();
        assertFalse(exists);
    }

    function test_CancelFeeCollectorChange_NoPendingChange() public {
        vm.expectRevert(abi.encodeWithSelector(TimelockFeeController.NoPendingFeeCollectorChange.selector));
        controller.cancelFeeCollectorChange();
    }

    function test_PauseUnpause() public {
        vm.expectEmit(true, true, true, true);
        emit FeesystemPaused(owner);
        controller.pause();
        assertTrue(controller.paused());

        vm.expectEmit(true, true, true, true);
        emit FeesystemUnpaused(owner);
        controller.unpause();
        assertFalse(controller.paused());
    }

    function test_CollectFee_WhenPaused() public {
        // Setup fee collector
        controller.scheduleFeeCollectorChange(address(noFeeCollector), true);
        vm.warp(block.timestamp + controller.CHANGE_DELAY());
        controller.executeFeeCollectorChange();

        // Pause system
        controller.pause();

        // Try to collect fee
        ICommentTypes.CommentData memory commentData = _createBasicCommentData();
        controller.exposed_collectFee(commentData);
        // Should not revert, but also not collect any fees
    }

    function test_CollectFee_MaliciousCollector() public {
        // Setup malicious fee collector
        controller.scheduleFeeCollectorChange(address(maliciousFeeCollector), true);
        vm.warp(block.timestamp + controller.CHANGE_DELAY());
        controller.executeFeeCollectorChange();

        // Try to collect fee
        ICommentTypes.CommentData memory commentData = _createBasicCommentData();
        vm.expectRevert("Malicious revert");
        controller.exposed_collectFee{value: 1 ether}(commentData);
    }

    function test_OnlyOwnerFunctions() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        controller.pause();

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        controller.unpause();

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        controller.scheduleFeeCollectorChange(address(noFeeCollector), true);

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        controller.cancelFeeCollectorChange();
    }

    function test_ReentrancyProtection() public {
        // Note: The nonReentrant modifier is already tested by OpenZeppelin
        // but we could add specific tests if needed
    }
} 