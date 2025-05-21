// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { IChannelManager } from "../src/interfaces/IChannelManager.sol";
import { IERC721Receiver } from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { TestUtils, MockHook } from "./utils.sol";
import { Comments } from "../src/libraries/Comments.sol";
import { Hooks } from "../src/libraries/Hooks.sol";
import { Channels } from "../src/libraries/Channels.sol";
import { IHook } from "../src/interfaces/IHook.sol";
import { BaseHook } from "../src/hooks/BaseHook.sol";

// Invalid hook that doesn't support the interface
contract InvalidHook {
  function supportsInterface(bytes4) external pure returns (bool) {
    return false;
  }
}

contract RejectChannelUpdateHook is BaseHook {
  function getHookPermissions()
    external
    pure
    override
    returns (Hooks.Permissions memory)
  {
    return
      Hooks.Permissions({
        onInitialized: false,
        onCommentAdded: false,
        onCommentDeleted: false,
        onCommentEdited: false,
        onChannelUpdated: true
      });
  }

  function onChannelUpdated(
    address,
    uint256,
    Channels.Channel calldata
  ) external pure override returns (bool) {
    revert("Rejected by hook");
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

  event ChannelCreated(uint256 indexed channelId, string name, string metadata);
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
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      name,
      description,
      metadata,
      address(0)
    );

    Channels.Channel memory channel = channelManager.getChannel(channelId);

    assertEq(channel.name, name);
    assertEq(channel.description, description);
    assertEq(channel.metadata, metadata);
    assertEq(address(channel.hook), address(0));
    assertEq(address(channelManager).balance - initialBalance, 0.02 ether);
  }

  function test_CreateChannelWithHook() public {
    string memory name = "Test Channel";
    string memory description = "Test Description";
    string memory metadata = "{}";

    uint256 initialBalance = address(channelManager).balance;
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      name,
      description,
      metadata,
      address(mockHook)
    );

    Channels.Channel memory channel = channelManager.getChannel(channelId);
    assertEq(address(channel.hook), address(mockHook));
    assertEq(address(channelManager).balance - initialBalance, 0.02 ether);
  }

  function test_UpdateChannel() public {
    // First create a channel
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
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

    Channels.Channel memory channel = channelManager.getChannel(channelId);

    assertEq(channel.name, newName);
    assertEq(channel.description, newDescription);
    assertEq(channel.metadata, newMetadata);
  }

  function test_SetHook() public {
    // Create channel without hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Description",
      "{}",
      address(0)
    );

    // Set hook
    channelManager.setHook(channelId, address(mockHook));

    Channels.Channel memory channel = channelManager.getChannel(channelId);
    assertEq(address(channel.hook), address(mockHook));
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
