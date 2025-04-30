// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ChannelManager} from "../src/ChannelManager.sol";
import {CommentManager} from "../src/CommentManager.sol";
import {TestUtils, MockHook} from "../test/utils.sol";
import {Comments} from "../src/libraries/Comments.sol";
import {Hooks} from "../src/libraries/Hooks.sol";

/// @notice This script is used to debug the gas usage of the ChannelManager and CommentManager contracts.
/// @dev This script is not used in the protocol and should not be used in production.
contract DebugGasUsage is Test, IERC721Receiver {
    CommentManager public comments;
    ChannelManager public channelManager;
    MockHook public mockHook;

    address public owner;
    address public user1;
    address public user2;

    uint256 channelId;
    Comments.CommentData commentData;

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        (comments, channelManager) = TestUtils.createContracts(owner);

        vm.deal(address(this), 10 ether);
    }

    function run() public {
        debugExecuteHook();
        debugConstructChannelManager();
        debugCreateChannel();
        debugUpdateChannel();
    }

    function debugExecuteHook() public {
        mockHook = new MockHook();

        // Create channel with hook
        channelId = channelManager.createChannel{value: 0.02 ether}(
            "Test Channel",
            "Description",
            "{}",
            address(mockHook)
        );

        // Create comment data using direct construction
        commentData = Comments.CommentData({
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

        measureGas("executeHook", runExecuteHook);
    }

    function runExecuteHook() internal {
        channelManager.executeHook{value: 0.02 ether}(
            channelId,
            commentData,
            user1,
            bytes32(0),
            Hooks.HookPhase.BeforeComment
        );
    }

    function debugConstructChannelManager() public {
        measureGas("constructChannelManager", runConstructChannelManager);
    }

    function runConstructChannelManager() internal {
        new ChannelManager(address(this));
    }

    function debugCreateChannel() public {
        measureGas("createChannel", runCreateChannel);
    }

    function runCreateChannel() internal {
        channelManager.createChannel{value: 0.02 ether}(
            "Test Channel 2",
            "Description",
            "{}",
            address(0)
        );
    }

    function debugUpdateChannel() public {
        measureGas("updateChannel", runUpdateChannel);
    }

    function runUpdateChannel() internal {
        channelManager.updateChannel(
            channelId,
            "Test Channel 3",
            "Description",
            "{}"
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
