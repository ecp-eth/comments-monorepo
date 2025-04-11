// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ChannelManager} from "../src/ChannelManager.sol";
import {CommentsV1} from "../src/CommentsV1.sol";
import {IHook} from "../src/interfaces/IHook.sol";
import {ICommentTypes} from "../src/interfaces/ICommentTypes.sol";
import {IChannelManager} from "../src/interfaces/IChannelManager.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

// Mock hook contract for testing
contract MockHook is IHook {
    bool public shouldReturnTrue = true;

    function setShouldReturnTrue(bool _shouldReturn) external {
        shouldReturnTrue = _shouldReturn;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IHook).interfaceId;
    }

    function beforeComment(
        ICommentTypes.CommentData calldata,
        address,
        bytes32
    ) external payable returns (bool) {
        return shouldReturnTrue;
    }

    function afterComment(
        ICommentTypes.CommentData calldata,
        address,
        bytes32
    ) external returns (bool) {
        return shouldReturnTrue;
    }
}

// Invalid hook that doesn't support the interface
contract InvalidHook {
    function supportsInterface(bytes4) external pure returns (bool) {
        return false;
    }
}

contract ChannelManagerTest is Test, IERC721Receiver {
    ChannelManager public channelManager;
    MockHook public mockHook;
    InvalidHook public invalidHook;
    address public commentsContract;

    address public owner;
    address public user1;
    address public user2;

    event ChannelCreated(uint256 indexed channelId, string name, address indexed owner, string metadata);
    event ChannelUpdated(uint256 indexed channelId, string name, string description, string metadata, bool isPrivate, bool isArchived);
    event HookAdded(uint256 indexed channelId, address indexed hook);
    event HookRemoved(uint256 indexed channelId, address indexed hook);
    event HookStatusUpdated(uint256 indexed channelId, address indexed hook, bool enabled);
    event HookRegistered(address indexed hook);
    event HookGlobalStatusUpdated(address indexed hook, bool enabled);

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        mockHook = new MockHook();
        invalidHook = new InvalidHook();

        // Deploy CommentsV1 first with zero address
        CommentsV1 comments = new CommentsV1(address(0));
        
        // Deploy ChannelManager with CommentsV1 address
        channelManager = new ChannelManager(owner, address(comments));
        
        // Deploy final CommentsV1 with correct address
        comments = new CommentsV1(address(channelManager));
        commentsContract = address(comments);
        channelManager.updateCommentsContract(commentsContract);

        // Register the mock hook
        channelManager.registerHook{value: 0.02 ether}(address(mockHook));
        // Enable the hook globally
        channelManager.setHookGloballyEnabled(address(mockHook), true);

        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
    }

    function test_CreateChannel() public {
        string memory name = "Test Channel";
        string memory description = "Test Description";
        string memory metadata = "{}";
        bool isPrivate = false;
        address[] memory hooks = new address[](0);

        uint256 channelId = channelManager.createChannel{value: 0.02 ether}(
            name,
            description,
            metadata,
            isPrivate,
            hooks
        );

        (
            string memory channelName,
            string memory channelDesc,
            string memory channelMeta,
            address channelOwner,
            bool channelPrivate,
            bool channelArchived,
            address[] memory channelHooks
        ) = channelManager.getChannel(channelId);

        assertEq(channelName, name);
        assertEq(channelDesc, description);
        assertEq(channelMeta, metadata);
        assertEq(channelOwner, address(this));
        assertEq(channelPrivate, isPrivate);
        assertEq(channelArchived, false);
        assertEq(channelHooks.length, 0);
    }

    function test_CreateChannelWithHook() public {
        string memory name = "Test Channel";
        string memory description = "Test Description";
        string memory metadata = "{}";
        bool isPrivate = false;
        
        address[] memory hooks = new address[](1);
        hooks[0] = address(mockHook);

        uint256 channelId = channelManager.createChannel{value: 0.02 ether}(
            name,
            description,
            metadata,
            isPrivate,
            hooks
        );

        (,,,,,,address[] memory channelHooks) = channelManager.getChannel(channelId);
        assertEq(channelHooks.length, 1);
        assertEq(channelHooks[0], address(mockHook));
        assertTrue(channelManager.isHookEnabled(channelId, address(mockHook)));
    }

    function test_UpdateChannel() public {
        // First create a channel
        uint256 channelId = channelManager.createChannel{value: 0.02 ether}(
            "Initial Name",
            "Initial Description",
            "{}",
            false,
            new address[](0)
        );

        // Update the channel
        string memory newName = "Updated Name";
        string memory newDescription = "Updated Description";
        string memory newMetadata = "{\"updated\": true}";
        bool newIsPrivate = true;
        bool newIsArchived = true;

        channelManager.updateChannel(
            channelId,
            newName,
            newDescription,
            newMetadata,
            newIsPrivate,
            newIsArchived
        );

        (
            string memory channelName,
            string memory channelDesc,
            string memory channelMeta,
            ,
            bool channelPrivate,
            bool channelArchived,
        ) = channelManager.getChannel(channelId);

        assertEq(channelName, newName);
        assertEq(channelDesc, newDescription);
        assertEq(channelMeta, newMetadata);
        assertEq(channelPrivate, newIsPrivate);
        assertEq(channelArchived, newIsArchived);
    }

    function test_AddHook() public {
        // Create channel without hook
        uint256 channelId = channelManager.createChannel{value: 0.02 ether}(
            "Test Channel",
            "Description",
            "{}",
            false,
            new address[](0)
        );

        // Add hook
        channelManager.addHook(channelId, address(mockHook));

        (,,,,,,address[] memory hooks) = channelManager.getChannel(channelId);
        assertEq(hooks.length, 1);
        assertEq(hooks[0], address(mockHook));
        assertTrue(channelManager.isHookEnabled(channelId, address(mockHook)));
    }

    function test_RemoveHook() public {
        // Create channel with hook
        address[] memory hooks = new address[](1);
        hooks[0] = address(mockHook);
        
        uint256 channelId = channelManager.createChannel{value: 0.02 ether}(
            "Test Channel",
            "Description",
            "{}",
            false,
            hooks
        );

        // Remove hook
        channelManager.removeHook(channelId, address(mockHook));

        (,,,,,,address[] memory channelHooks) = channelManager.getChannel(channelId);
        assertEq(channelHooks.length, 0);
        assertFalse(channelManager.isHookEnabled(channelId, address(mockHook)));
    }

    function test_SetHookEnabled() public {
        // Create channel with hook
        address[] memory hooks = new address[](1);
        hooks[0] = address(mockHook);
        
        uint256 channelId = channelManager.createChannel{value: 0.02 ether}(
            "Test Channel",
            "Description",
            "{}",
            false,
            hooks
        );

        // Disable hook
        channelManager.setHookEnabled(channelId, address(mockHook), false);
        assertFalse(channelManager.isHookEnabled(channelId, address(mockHook)));

        // Re-enable hook
        channelManager.setHookEnabled(channelId, address(mockHook), true);
        assertTrue(channelManager.isHookEnabled(channelId, address(mockHook)));
    }

    function test_ExecuteHooks() public {
        // Create channel with hook
        address[] memory hooks = new address[](1);
        hooks[0] = address(mockHook);
        
        uint256 channelId = channelManager.createChannel{value: 0.02 ether}(
            "Test Channel",
            "Description",
            "{}",
            false,
            hooks
        );

        // Create comment data
        ICommentTypes.CommentData memory commentData = ICommentTypes.CommentData({
            content: "Test comment",
            metadata: "{}",
            targetUri: "https://example.com",
            commentType: "comment",
            author: user1,
            appSigner: user2,
            channelId: channelId,
            nonce: 0,
            deadline: block.timestamp + 1 days
        });

        // Test beforeComment hook
        vm.prank(commentsContract);
        assertTrue(channelManager.executeHooks(
            channelId,
            commentData,
            user1,
            bytes32(0),
            IChannelManager.HookPhase.Before
        ));

        // Test afterComment hook
        vm.prank(commentsContract);
        assertTrue(channelManager.executeHooks(
            channelId,
            commentData,
            user1,
            bytes32(0),
            IChannelManager.HookPhase.After
        ));

        // Test with hook returning false
        mockHook.setShouldReturnTrue(false);
        vm.prank(commentsContract);
        assertFalse(channelManager.executeHooks(
            channelId,
            commentData,
            user1,
            bytes32(0),
            IChannelManager.HookPhase.Before
        ));
    }

    function test_RevertWhen_CreatingChannelWithInvalidHook() public {
        address[] memory hooks = new address[](1);
        hooks[0] = address(invalidHook);
        
        vm.expectRevert(abi.encodeWithSelector(IChannelManager.InvalidHookInterface.selector));
        channelManager.createChannel{value: 0.02 ether}(
            "Test Channel",
            "Description",
            "{}",
            false,
            hooks
        );
    }

    function test_RevertWhen_AddingUnregisteredHook() public {
        uint256 channelId = channelManager.createChannel{value: 0.02 ether}(
            "Test Channel",
            "Description",
            "{}",
            false,
            new address[](0)
        );

        // Create a new valid hook but don't register it
        MockHook unregisteredHook = new MockHook();

        // Try to add an unregistered hook
        vm.expectRevert(abi.encodeWithSelector(IChannelManager.HookNotRegistered.selector));
        channelManager.addHook(channelId, address(unregisteredHook));
    }

    function test_RevertWhen_RegisteringInvalidHook() public {
        // Try to register the invalid hook
        vm.expectRevert(abi.encodeWithSelector(IChannelManager.InvalidHookInterface.selector));
        channelManager.registerHook{value: 0.1 ether}(address(invalidHook));
    }

    function test_RevertWhen_NonOwnerUpdatesChannel() public {
        uint256 channelId = channelManager.createChannel{value: 0.02 ether}(
            "Test Channel",
            "Description",
            "{}",
            false,
            new address[](0)
        );

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(IChannelManager.NotChannelOwner.selector));
        channelManager.updateChannel(
            channelId,
            "New Name",
            "New Description",
            "{}",
            false,
            false
        );
    }

    function test_TransferChannel() public {
        // Create channel
        uint256 channelId = channelManager.createChannel{value: 0.02 ether}(
            "Test Channel",
            "Description",
            "{}",
            false,
            new address[](0)
        );

        // Transfer to user1
        channelManager.transferFrom(address(this), user1, channelId);

        (,,,address newOwner,,,) = channelManager.getChannel(channelId);
        assertEq(newOwner, user1);

        // Verify user1 can now update the channel
        vm.prank(user1);
        channelManager.updateChannel(
            channelId,
            "New Name",
            "New Description",
            "{}",
            true,
            false
        );
    }

    function test_GlobalHookManagement() public {
        // Create a new hook for testing global management
        MockHook newHook = new MockHook();
        
        // Register the new hook
        channelManager.registerHook{value: 0.02 ether}(address(newHook));
        
        // Test initial hook registration status
        (bool registered, bool enabled) = channelManager.getHookStatus(address(newHook));
        assertTrue(registered);
        assertFalse(enabled); // Should be disabled by default after registration
        
        // Enable hook globally
        channelManager.setHookGloballyEnabled(address(newHook), true);
        (registered, enabled) = channelManager.getHookStatus(address(newHook));
        assertTrue(registered);
        assertTrue(enabled);
        
        // Disable hook globally
        channelManager.setHookGloballyEnabled(address(newHook), false);
        (registered, enabled) = channelManager.getHookStatus(address(newHook));
        assertTrue(registered);
        assertFalse(enabled);
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