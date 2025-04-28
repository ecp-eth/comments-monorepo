// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ChannelManager} from "../src/ChannelManager.sol";
import {IHook} from "../src/interfaces/IHook.sol";
import {ICommentTypes} from "../src/interfaces/ICommentTypes.sol";

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

contract ChannelManagerTest is Test {
    ChannelManager public channelManager;
    MockHook public mockHook;
    InvalidHook public invalidHook;

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

        channelManager = new ChannelManager(owner);
        mockHook = new MockHook();
        invalidHook = new InvalidHook();

        // Register the mock hook
        channelManager.registerHook(address(mockHook));
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

        uint256 channelId = channelManager.createChannel(
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

        uint256 channelId = channelManager.createChannel(
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
        uint256 channelId = channelManager.createChannel(
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
        uint256 channelId = channelManager.createChannel(
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
        
        uint256 channelId = channelManager.createChannel(
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
        
        uint256 channelId = channelManager.createChannel(
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
        
        uint256 channelId = channelManager.createChannel(
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
            author: user1,
            appSigner: user2,
            nonce: 0,
            deadline: block.timestamp + 1 days
        });

        // Test beforeComment hook
        assertTrue(channelManager.executeHooks(
            channelId,
            commentData,
            user1,
            bytes32(0),
            true
        ));

        // Test afterComment hook
        assertTrue(channelManager.executeHooks(
            channelId,
            commentData,
            user1,
            bytes32(0),
            false
        ));

        // Test with hook returning false
        mockHook.setShouldReturnTrue(false);
        assertFalse(channelManager.executeHooks(
            channelId,
            commentData,
            user1,
            bytes32(0),
            true
        ));
    }

    function testFail_CreateChannelWithInvalidHook() public {
        address[] memory hooks = new address[](1);
        hooks[0] = address(invalidHook);
        
        channelManager.createChannel(
            "Test Channel",
            "Description",
            "{}",
            false,
            hooks
        );
    }

    function testFail_AddInvalidHook() public {
        uint256 channelId = channelManager.createChannel(
            "Test Channel",
            "Description",
            "{}",
            false,
            new address[](0)
        );

        channelManager.addHook(channelId, address(invalidHook));
    }

    function testFail_NonOwnerUpdateChannel() public {
        uint256 channelId = channelManager.createChannel(
            "Test Channel",
            "Description",
            "{}",
            false,
            new address[](0)
        );

        vm.prank(user1);
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
        uint256 channelId = channelManager.createChannel(
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
        // Test hook registration status
        (bool registered, bool enabled) = channelManager.getHookStatus(address(mockHook));
        assertTrue(registered);
        assertTrue(enabled);

        // Disable hook globally
        channelManager.setHookGloballyEnabled(address(mockHook), false);
        
        (registered, enabled) = channelManager.getHookStatus(address(mockHook));
        assertTrue(registered);
        assertFalse(enabled);

        // Create channel with hook
        address[] memory hooks = new address[](1);
        hooks[0] = address(mockHook);
        
        uint256 channelId = channelManager.createChannel(
            "Test Channel",
            "Description",
            "{}",
            false,
            hooks
        );

        // Verify hook execution fails when globally disabled
        ICommentTypes.CommentData memory commentData = ICommentTypes.CommentData({
            content: "Test comment",
            metadata: "{}",
            targetUri: "https://example.com",
            author: user1,
            appSigner: user2,
            nonce: 0,
            deadline: block.timestamp + 1 days
        });

        vm.expectRevert(ChannelManager.HookDisabledGlobally.selector);
        channelManager.executeHooks(
            channelId,
            commentData,
            user1,
            bytes32(0),
            true
        );
    }
} 