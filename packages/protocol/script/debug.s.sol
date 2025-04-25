// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ChannelManager} from "../src/ChannelManager.sol";
import {CommentsV1} from "../src/CommentsV1.sol";
import {ICommentTypes} from "../src/interfaces/ICommentTypes.sol";
import {IChannelManager} from "../src/interfaces/IChannelManager.sol";
import {TestUtils, MockHook} from "../test/utils.sol";

/// @notice This script is used to debug the gas usage of the ChannelManager and CommentsV1 contracts.
/// @dev This script is not used in the protocol and should not be used in production.
contract DebugGasUsage is Test, IERC721Receiver {
    CommentsV1 public comments;
    ChannelManager public channelManager;
    MockHook public mockHook;

    address public owner;
    address public user1;
    address public user2;

    uint256 channelId;
    ICommentTypes.CommentData commentData;

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        (comments, channelManager) = TestUtils.createContracts(owner);

        vm.deal(address(this), 10 ether);
    }

    function run() public {
        debugRegisterHook();
        debugSetHookGloballyEnabledTrue();
        debugSetHookGloballyEnabledFalse();
        debugExecuteHooks();
    }

    function debugRegisterHook() public {
        mockHook = new MockHook();

        measureGas("registerHook", runRegisterHook);
    }

    function runRegisterHook() internal {
        channelManager.registerHook{value: 0.02 ether}(address(mockHook));
    }

    function debugSetHookGloballyEnabledTrue() public {
        mockHook = new MockHook();
        channelManager.registerHook{value: 0.02 ether}(address(mockHook));

        measureGas("setHookGloballyEnabledTrue", runSetHookGloballyEnabledTrue);
    }

    function runSetHookGloballyEnabledTrue() internal {
        channelManager.setHookGloballyEnabled(address(mockHook), true);
    }

    function debugSetHookGloballyEnabledFalse() public {
        mockHook = new MockHook();
        channelManager.registerHook{value: 0.02 ether}(address(mockHook));

        measureGas(
            "setHookGloballyEnabledFalse",
            runSetHookGloballyEnabledFalse
        );
    }

    function runSetHookGloballyEnabledFalse() internal {
        channelManager.setHookGloballyEnabled(address(mockHook), false);
    }

    function debugExecuteHooks() public {
        mockHook = new MockHook();

        // Register the mock hook
        channelManager.registerHook{value: 0.02 ether}(address(mockHook));
        // Enable the hook globally
        channelManager.setHookGloballyEnabled(address(mockHook), true);

        // Create channel with hook
        channelId = channelManager.createChannel{value: 0.02 ether}(
            "Test Channel",
            "Description",
            "{}",
            address(mockHook)
        );

        // Create comment data using direct construction
        commentData = ICommentTypes.CommentData({
            content: "Test comment",
            metadata: "{}",
            targetUri: "",
            commentType: "comment",
            author: user1,
            appSigner: user2,
            channelId: channelId,
            nonce: comments.nonces(user1, user2),
            deadline: block.timestamp + 1 days,
            parentId: bytes32(0)
        });

        vm.deal(address(comments), 10 ether);
        vm.prank(address(comments));

        measureGas("executeHooks", runExecuteHooks);
    }

    function runExecuteHooks() internal {
        channelManager.executeHooks{value: 0.02 ether}(
            channelId,
            commentData,
            user1,
            bytes32(0),
            IChannelManager.HookPhase.Before
        );
    }

    // Internal function to measure gas usage
    function measureGas(
        string memory operationName,
        function() internal fn
    ) internal {
        uint256 gasStart = gasleft();
        fn();
        uint256 gasUsed = gasStart - gasleft();
        console.log("Gas used for", operationName, ":", gasUsed);
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
