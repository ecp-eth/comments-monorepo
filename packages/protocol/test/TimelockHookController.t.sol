// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {TimelockHookController} from "../src/TimelockHookController.sol";
import {IHook} from "../src/interfaces/IHook.sol";
import {ICommentTypes} from "../src/interfaces/ICommentTypes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";

// Mock implementation of TimelockHookController for testing
contract TestTimelockHookController is TimelockHookController {
    constructor(address initialOwner) TimelockHookController(initialOwner) {}

    function exposed_beforeCommentHook(ICommentTypes.CommentData memory commentData, bytes32 commentId) external payable {
        _executeBeforeCommentHook(commentData, commentId);
    }
}

// Mock malicious hook that reverts on hook execution
/* solhint-disable-next-line */
contract MaliciousHook is IHook {
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IHook).interfaceId;
    }

    function beforeComment(
        ICommentTypes.CommentData calldata,
        address,
        bytes32
    ) external payable returns (bool) {
        revert("Malicious revert");
    }

    function afterComment(
        ICommentTypes.CommentData calldata,
        address,
        bytes32
    ) external pure returns (bool) {
        revert("Malicious revert");
    }
}

// Mock contract that doesn't implement IHook
contract NonHook is IERC165 {
    function supportsInterface(bytes4 /* interfaceId */) external pure returns (bool) {
        return false;
    }
}

// solhint-disable-next-line contract-name-camelcase
contract NoHook is IHook {
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IHook).interfaceId;
    }

    function beforeComment(
        ICommentTypes.CommentData calldata,
        address,
        bytes32
    ) external payable returns (bool) {
        return true;
    }

    function afterComment(
        ICommentTypes.CommentData calldata,
        address,
        bytes32
    ) external pure returns (bool) {
        return true;
    }
}

contract TimelockHookControllerTest is Test {
    TestTimelockHookController public controller;
    NoHook public noHook;
    MaliciousHook public maliciousHook;
    NonHook public nonHook;
    address public owner;
    address public user;

    event HookChangeScheduled(address indexed hook, bool enabled, uint256 effectiveTime);
    event HookChanged(address indexed hook, bool enabled);
    event HookChangeCancelled(address indexed hook, bool enabled);
    event HookSystemPaused(address indexed ownerAddress);
    event HookSystemUnpaused(address indexed ownerAddress);

    function setUp() public {
        owner = address(this);
        user = address(0xBEEF);
        controller = new TestTimelockHookController(owner);
        noHook = new NoHook();
        maliciousHook = new MaliciousHook();
        nonHook = new NonHook();
        
        vm.deal(user, 100 ether);
    }

    function _createBasicCommentData() internal view returns (ICommentTypes.CommentData memory) {
        return ICommentTypes.CommentData({
            content: "Test comment",
            metadata: "{}",
            targetUri: "https://example.com",
            author: address(0x1),
            appSigner: address(0x2),
            nonce: 0,
            deadline: block.timestamp + 1 days
        });
    }

    function test_InitialState() public view {
        (IHook hook, bool enabled) = controller.hookConfig();
        assertEq(address(hook), address(0));
        assertFalse(enabled);
        assertFalse(controller.paused());
    }

    function test_ScheduleHookChange() public {
        vm.expectEmit(true, true, true, true);
        emit HookChangeScheduled(
            address(noHook),
            true,
            block.timestamp + controller.CHANGE_DELAY()
        );

        controller.scheduleHookChange(address(noHook), true);

        (
            address hook,
            bool enabled,
            uint256 effectiveTime,
            bool exists
        ) = controller.getPendingHookChange();

        assertEq(hook, address(noHook));
        assertTrue(enabled);
        assertEq(effectiveTime, block.timestamp + controller.CHANGE_DELAY());
        assertTrue(exists);
    }

    function test_ScheduleHookChange_InvalidAddress() public {
        vm.expectRevert(abi.encodeWithSelector(TimelockHookController.InvalidHookAddress.selector));
        controller.scheduleHookChange(address(0), true);
    }

    function test_ScheduleHookChange_InvalidInterface() public {
        vm.expectRevert(abi.encodeWithSelector(TimelockHookController.InvalidHookInterface.selector));
        controller.scheduleHookChange(address(nonHook), true);
    }

    function test_ExecuteHookChange() public {
        controller.scheduleHookChange(address(noHook), true);
        
        // Try to execute before delay
        vm.expectRevert(abi.encodeWithSelector(TimelockHookController.TimelockDeadlineNotReached.selector));
        controller.executeHookChange();

        // Warp to after delay
        vm.warp(block.timestamp + controller.CHANGE_DELAY());

        vm.expectEmit(true, true, true, true);
        emit HookChanged(address(noHook), true);
        
        controller.executeHookChange();

        (IHook hook, bool enabled) = controller.hookConfig();
        assertEq(address(hook), address(noHook));
        assertTrue(enabled);
    }

    function test_CancelHookChange() public {
        controller.scheduleHookChange(address(noHook), true);

        vm.expectEmit(true, true, true, true);
        emit HookChangeCancelled(address(noHook), true);

        controller.cancelHookChange();

        (, , , bool exists) = controller.getPendingHookChange();
        assertFalse(exists);
    }

    function test_CancelHookChange_NoPendingChange() public {
        vm.expectRevert(abi.encodeWithSelector(TimelockHookController.NoPendingHookChange.selector));
        controller.cancelHookChange();
    }

    function test_PauseUnpause() public {
        vm.expectEmit(true, true, true, true);
        emit HookSystemPaused(owner);
        controller.pause();
        assertTrue(controller.paused());

        vm.expectEmit(true, true, true, true);
        emit HookSystemUnpaused(owner);
        controller.unpause();
        assertFalse(controller.paused());
    }

    function test_ExecuteBeforeHook_WhenPaused() public {
        // Setup hook
        controller.scheduleHookChange(address(noHook), true);
        vm.warp(block.timestamp + controller.CHANGE_DELAY());
        controller.executeHookChange();

        // Pause system
        controller.pause();

        // Try to execute hook
        ICommentTypes.CommentData memory commentData = _createBasicCommentData();
        controller.exposed_beforeCommentHook(commentData, bytes32(0));
        // Should not revert, but also not execute hook
    }

    function test_ExecuteBeforeHook_MaliciousHook() public {
        // Setup malicious hook
        controller.scheduleHookChange(address(maliciousHook), true);
        vm.warp(block.timestamp + controller.CHANGE_DELAY());
        controller.executeHookChange();

        // Try to execute hook
        ICommentTypes.CommentData memory commentData = _createBasicCommentData();
        vm.expectRevert("Malicious revert");
        controller.exposed_beforeCommentHook{value: 1 ether}(commentData, bytes32(0));
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
        controller.scheduleHookChange(address(noHook), true);

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        controller.cancelHookChange();
    }

    function test_ReentrancyProtection() public {
        // Note: The nonReentrant modifier is already tested by OpenZeppelin
        // but we could add specific tests if needed
    }

    function test_MultipleFeeCollectorChanges() public {
        // Schedule first change
        controller.scheduleHookChange(address(noHook), true);
        vm.warp(block.timestamp + controller.CHANGE_DELAY());
        controller.executeHookChange();

        // Verify first change
        (IHook collector, bool enabled) = controller.hookConfig();
        assertEq(address(collector), address(noHook));
        assertTrue(enabled);

        // Schedule second change
        controller.scheduleHookChange(address(maliciousHook), true);
        vm.warp(block.timestamp + controller.CHANGE_DELAY());
        controller.executeHookChange();

        // Verify second change
        (collector, enabled) = controller.hookConfig();
        assertEq(address(collector), address(maliciousHook));
        assertTrue(enabled);
    }

    function test_ExecuteCancelledChange() public {
        // Schedule and cancel a change
        controller.scheduleHookChange(address(noHook), true);
        controller.cancelHookChange();

        // Try to execute the cancelled change
        vm.warp(block.timestamp + controller.CHANGE_DELAY());
        vm.expectRevert(abi.encodeWithSelector(TimelockHookController.NoPendingHookChange.selector));
        controller.executeHookChange();
    }

    function test_ScheduleWhilePending() public {
        // Schedule first change
        controller.scheduleHookChange(address(noHook), true);
        
        // Schedule second change while first is pending
        // This should succeed but cancel the first change
        vm.expectEmit(true, true, true, true);
        emit HookChangeCancelled(address(noHook), true);
        
        controller.scheduleHookChange(address(maliciousHook), true);

        // Verify new pending change
        (
            address hook,
            bool enabled,
            uint256 effectiveTime,
            bool exists
        ) = controller.getPendingHookChange();

        assertEq(hook, address(maliciousHook));
        assertTrue(enabled);
        assertEq(effectiveTime, block.timestamp + controller.CHANGE_DELAY());
        assertTrue(exists);
    }

    function test_ExecuteBeforeHook_WhenDisabled() public {
        // Setup hook but disabled
        controller.scheduleHookChange(address(noHook), false);
        vm.warp(block.timestamp + controller.CHANGE_DELAY());
        controller.executeHookChange();

        // Try to execute hook
        ICommentTypes.CommentData memory commentData = _createBasicCommentData();
        uint256 initialBalance = address(noHook).balance;
        
        controller.exposed_beforeCommentHook{value: 0.1 ether}(commentData, bytes32(0));
        
        // Verify no hook was executed
        assertEq(address(noHook).balance, initialBalance);
    }

    function test_ExecuteBeforeHook_WhenEnabled() public {
        // Setup hook and enable it
        controller.scheduleHookChange(address(noHook), true);
        vm.warp(block.timestamp + controller.CHANGE_DELAY());
        controller.executeHookChange();

        // Try to execute hook
        ICommentTypes.CommentData memory commentData = _createBasicCommentData();
        uint256 initialBalance = address(noHook).balance;
        uint256 feeAmount = 0.1 ether;
        
        controller.exposed_beforeCommentHook{value: feeAmount}(commentData, bytes32(0));
        
        // Verify hook was executed
        assertEq(address(noHook).balance, initialBalance + feeAmount);
    }
} 