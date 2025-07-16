// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { BroadcastHook } from "../src/hooks/BroadcastHook.sol";
import { Channels } from "../src/types/Channels.sol";
import { Comments } from "../src/types/Comments.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { IHook } from "../src/interfaces/IHook.sol";
import { Hooks } from "../src/types/Hooks.sol";
import { Metadata } from "../src/types/Metadata.sol";
import { console } from "forge-std/console.sol";

contract BroadcastHookTest is Test {
  BroadcastHook public hook;
  CommentManager public commentManager;
  ChannelManager public channelManager;
  address public creator;
  address public nonWhitelisted;
  address public initialOwner;
  uint256 public channelId;
  uint256 public channelCreationFee;

  function setUp() public {
    // Owner of channel and comment managers
    address managersOwner = makeAddr("managersOwner");
    vm.startPrank(managersOwner);

    // Deploy core contracts
    channelManager = new ChannelManager(managersOwner);
    commentManager = new CommentManager(managersOwner);

    // Set up cross-contract references
    commentManager.updateChannelContract(address(channelManager));

    vm.stopPrank();

    // Deploy contracts
    initialOwner = makeAddr("owner");
    vm.startPrank(initialOwner);

    // Give the initialOwner some ETH
    vm.deal(initialOwner, 1 ether);

    // Deploy hook
    hook = new BroadcastHook(address(channelManager));

    // Setup test addresses
    creator = makeAddr("creator");
    nonWhitelisted = makeAddr("nonWhitelisted");

    // Whitelist the creator
    hook.setWhitelistStatus(creator, true);

    // Get channel creation fee
    channelCreationFee = channelManager.getChannelCreationFee();

    // Give creator some ETH for channel creation
    vm.deal(creator, 1 ether);

    vm.stopPrank();
  }

  function test_CreateChannelWhitelisted() public {
    vm.startPrank(creator);

    channelId = hook.createChannel{ value: channelCreationFee }(
      "Test Channel",
      "Test Description",
      new Metadata.MetadataEntry[](0)
    );

    // Verify channel exists and creator is set correctly
    (uint256[] memory channelIds, address[] memory creators) = hook
      .getChannels();
    assertEq(channelIds.length, 1);
    assertEq(channelIds[0], channelId);
    assertEq(creators[0], creator);

    // Verify creator owns the channel NFT
    assertEq(channelManager.ownerOf(channelId), creator);

    vm.stopPrank();
  }

  function test_CreateChannelNonWhitelisted() public {
    vm.startPrank(nonWhitelisted);
    vm.deal(nonWhitelisted, channelCreationFee);

    vm.expectRevert(BroadcastHook.NotWhitelisted.selector);
    hook.createChannel{ value: channelCreationFee }(
      "Test Channel",
      "Test Description",
      new Metadata.MetadataEntry[](0)
    );

    vm.stopPrank();
  }

  function test_CreateChannelInsufficientFunds() public {
    vm.startPrank(creator);

    vm.expectRevert(BroadcastHook.InsufficientFunds.selector);
    hook.createChannel{ value: channelCreationFee - 1 }(
      "Test Channel",
      "Test Description",
      new Metadata.MetadataEntry[](0)
    );

    vm.stopPrank();
  }

  function test_CreatorCanPostTopLevelComment() public {
    // First create a channel
    vm.startPrank(creator);
    channelId = hook.createChannel{ value: channelCreationFee }(
      "Test Channel",
      "Test Description",
      new Metadata.MetadataEntry[](0)
    );

    // Create comment data
    Comments.CreateComment memory commentData = Comments.CreateComment({
      author: creator,
      app: creator,
      channelId: channelId,
      parentId: bytes32(0),
      content: "Test comment",
      metadata: new Metadata.MetadataEntry[](0),
      targetUri: "",
      commentType: 0, // COMMENT_TYPE_COMMENT
      deadline: block.timestamp + 1 hours
    });

    // Post comment as creator
    commentManager.postComment(commentData, "");
    vm.stopPrank();
  }

  function test_NonCreatorCannotPostTopLevelComment() public {
    // First create a channel as whitelisted creator
    vm.prank(creator);
    channelId = hook.createChannel{ value: channelCreationFee }(
      "Test Channel",
      "Test Description",
      new Metadata.MetadataEntry[](0)
    );

    // Try to post as non-creator
    vm.startPrank(nonWhitelisted);
    Comments.CreateComment memory commentData = Comments.CreateComment({
      author: nonWhitelisted,
      app: nonWhitelisted,
      channelId: channelId,
      parentId: bytes32(0),
      content: "Test comment",
      metadata: new Metadata.MetadataEntry[](0),
      targetUri: "",
      commentType: 0, // COMMENT_TYPE_COMMENT
      deadline: block.timestamp + 1 hours
    });

    vm.expectRevert(BroadcastHook.UnauthorizedCommenter.selector);
    commentManager.postComment(commentData, "");
    vm.stopPrank();
  }

  function test_AnyoneCanReplyToComments() public {
    // First create a channel and parent comment as creator
    vm.startPrank(creator);
    channelId = hook.createChannel{ value: channelCreationFee }(
      "Test Channel",
      "Test Description",
      new Metadata.MetadataEntry[](0)
    );

    Comments.CreateComment memory parentComment = Comments.CreateComment({
      author: creator,
      app: creator,
      channelId: channelId,
      parentId: bytes32(0),
      content: "Parent comment",
      metadata: new Metadata.MetadataEntry[](0),
      targetUri: "",
      commentType: 0, // COMMENT_TYPE_COMMENT
      deadline: block.timestamp + 1 hours
    });

    bytes32 parentId = commentManager.postComment(parentComment, "");
    vm.stopPrank();

    // Now create a reply as non-whitelisted user
    vm.startPrank(nonWhitelisted);
    Comments.CreateComment memory replyData = Comments.CreateComment({
      author: nonWhitelisted,
      app: nonWhitelisted,
      channelId: channelId,
      parentId: parentId,
      content: "Reply comment",
      metadata: new Metadata.MetadataEntry[](0),
      targetUri: "",
      commentType: 0, // COMMENT_TYPE_COMMENT
      deadline: block.timestamp + 1 hours
    });

    commentManager.postComment(replyData, "");
    vm.stopPrank();
  }

  function test_WhitelistModeToggle() public {
    // Initially whitelist mode is enabled
    assertTrue(hook.whitelistModeEnabled());

    // Non-owner cannot disable whitelist mode
    vm.prank(nonWhitelisted);
    vm.expectRevert(
      abi.encodeWithSignature(
        "OwnableUnauthorizedAccount(address)",
        nonWhitelisted
      )
    );
    hook.setWhitelistMode(false); // Owner can disable whitelist mode
    vm.prank(address(initialOwner));
    hook.setWhitelistMode(false);
    assertFalse(hook.whitelistModeEnabled());

    // Now non-whitelisted users can create channels
    vm.startPrank(nonWhitelisted);
    vm.deal(nonWhitelisted, channelCreationFee);

    channelId = hook.createChannel{ value: channelCreationFee }(
      "Test Channel",
      "Test Description",
      new Metadata.MetadataEntry[](0)
    );

    // Verify channel was created
    assertEq(channelManager.ownerOf(channelId), nonWhitelisted);
    vm.stopPrank();
  }
}
