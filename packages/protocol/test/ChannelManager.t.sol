// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ChannelManager} from "../src/ChannelManager.sol";
import {CommentManager} from "../src/CommentManager.sol";
import {IChannelManager} from "../src/interfaces/IChannelManager.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {TestUtils, MockHook} from "./utils.sol";
import {Comments} from "../src/libraries/Comments.sol";
import {Hooks} from "../src/libraries/Hooks.sol";
// Invalid hook that doesn't support the interface
contract InvalidHook {
    function supportsInterface(bytes4) external pure returns (bool) {
        return false;
    }
}

contract ChannelManagerTest is Test, IERC721Receiver {
    using TestUtils for string;

    CommentManager public comments;
    ChannelManager public channelManager;
    MockHook public mockHook;
    InvalidHook public invalidHook;

    address public owner;
    address public user1;
    address public user2;

    event ChannelCreated(
        uint256 indexed channelId,
        string name,
        string metadata
    );
    event ChannelUpdated(
        uint256 indexed channelId,
        string name,
        string description,
        string metadata
    );
    event HookSet(uint256 indexed channelId, address indexed hook);
    event HookStatusUpdated(
        uint256 indexed channelId,
        address indexed hook,
        bool enabled
    );
    event HookRegistered(address indexed hook);
    event HookGlobalStatusUpdated(address indexed hook, bool enabled);

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        mockHook = new MockHook();
        invalidHook = new InvalidHook();

        (comments, channelManager) = TestUtils.createContracts(owner);

        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
    }

    function test_CreateChannel() public {
        string memory name = "Test Channel";
        string memory description = "Test Description";
        string memory metadata = "{}";

        uint256 initialBalance = address(channelManager).balance;
        uint256 channelId = channelManager.createChannel{value: 0.02 ether}(
            name,
            description,
            metadata,
            address(0)
        );

        (
            string memory channelName,
            string memory channelDesc,
            string memory channelMeta,
            address hook
        ) = channelManager.getChannel(channelId);

        assertEq(channelName, name);
        assertEq(channelDesc, description);
        assertEq(channelMeta, metadata);
        assertEq(hook, address(0));
        assertEq(address(channelManager).balance - initialBalance, 0.02 ether);
    }

    function test_CreateChannelWithHook() public {
        string memory name = "Test Channel";
        string memory description = "Test Description";
        string memory metadata = "{}";

        uint256 initialBalance = address(channelManager).balance;
        uint256 channelId = channelManager.createChannel{value: 0.02 ether}(
            name,
            description,
            metadata,
            address(mockHook)
        );

        (, , , address channelHook) = channelManager.getChannel(channelId);
        assertEq(channelHook, address(mockHook));
        assertEq(address(channelManager).balance - initialBalance, 0.02 ether);
    }

    function test_UpdateChannel() public {
        // First create a channel
        uint256 channelId = channelManager.createChannel{value: 0.02 ether}(
            "Initial Name",
            "Initial Description",
            "{}",
            address(0)
        );

        // Update the channel
        string memory newName = "Updated Name";
        string memory newDescription = "Updated Description";
        string memory newMetadata = '{"updated": true}';

        channelManager.updateChannel(
            channelId,
            newName,
            newDescription,
            newMetadata
        );

        (
            string memory channelName,
            string memory channelDesc,
            string memory channelMeta,

        ) = channelManager.getChannel(channelId);

        assertEq(channelName, newName);
        assertEq(channelDesc, newDescription);
        assertEq(channelMeta, newMetadata);
    }

    function test_SetHook() public {
        // Create channel without hook
        uint256 channelId = channelManager.createChannel{value: 0.02 ether}(
            "Test Channel",
            "Description",
            "{}",
            address(0)
        );

        // Set hook
        channelManager.setHook(channelId, address(mockHook));

        (, , , address hook) = channelManager.getChannel(channelId);
        assertEq(hook, address(mockHook));
    }

    function test_ExecuteHook() public {
        // Create channel with hook
        uint256 channelId = channelManager.createChannel{value: 0.02 ether}(
            "Test Channel",
            "Description",
            "{}",
            address(mockHook)
        );

        // Create comment data using direct construction
        Comments.CommentData memory commentData = Comments.CommentData({
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

        // add some ether to the comments v1 contract to allow it to call hook with fee
        vm.deal(address(comments), 10 ether);

        // Test beforeComment hook
        vm.prank(address(comments));
        uint256 initialBalance = address(channelManager).balance;
        assertTrue(
            channelManager.executeHook{value: 0.02 ether}(
                channelId,
                commentData,
                user1,
                bytes32(0),
                Hooks.HookPhase.BeforeComment
            )
        );
        assertEq(
            address(channelManager).balance - initialBalance,
            // 0.02 * 2% = 0.0004
            0.0004 ether
        );

        // Test afterComment hook
        vm.prank(address(comments));
        assertTrue(
            channelManager.executeHook(
                channelId,
                commentData,
                user1,
                bytes32(0),
                Hooks.HookPhase.AfterComment
            )
        );

        // Test with hook returning false
        mockHook.setShouldReturnTrue(false);
        vm.prank(address(comments));
        vm.expectRevert(IChannelManager.ChannelHookExecutionFailed.selector);
        channelManager.executeHook(
            channelId,
            commentData,
            user1,
            bytes32(0),
            Hooks.HookPhase.BeforeComment
        );
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
