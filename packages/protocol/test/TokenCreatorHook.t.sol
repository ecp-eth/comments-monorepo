// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { TokenCreatorHook } from "../src/hooks/TokenCreatorHook.sol";
import { Channels } from "../src/libraries/Channels.sol";
import { Comments } from "../src/libraries/Comments.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { IHook } from "../src/interfaces/IHook.sol";
import { Hooks } from "../src/libraries/Hooks.sol";
import { console } from "forge-std/console.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

contract TokenCreatorHookTest is Test {
  TokenCreatorHook public hook;
  CommentManager public commentManager;
  ChannelManager public channelManager;
  address public tokenAddress;
  address public tokenCreator;
  uint256 public tokenChainId;
  uint256 public channelId;
  string public validMetadata;

  function setUp() public {
    // Deploy contracts
    address initialOwner = makeAddr("owner");
    vm.startPrank(initialOwner);

    // Give the initialOwner some ETH
    vm.deal(initialOwner, 1 ether);

    channelManager = new ChannelManager(initialOwner);
    commentManager = new CommentManager(initialOwner);

    // Set up cross-contract references
    channelManager.updateCommentsContract(address(commentManager));
    commentManager.updateChannelContract(address(channelManager));

    // Deploy and set up hook
    hook = new TokenCreatorHook();
    tokenAddress = makeAddr("token");
    tokenCreator = makeAddr("creator");
    tokenChainId = 1; // Ethereum mainnet

    // Create valid metadata JSON
    validMetadata = string.concat(
      '{"tokenAddress":"',
      _addressToString(tokenAddress),
      '","tokenCreator":"',
      _addressToString(tokenCreator),
      '","tokenChainId":"',
      vm.toString(tokenChainId),
      '"}'
    );

    console.log("validMetadata", validMetadata);

    // Create a channel with the hook
    // First create the channel
    channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Test Description",
      validMetadata,
      address(0) // Initially no hook
    );
    // Then set the hook
    channelManager.updateChannel(
      channelId,
      "Test Channel",
      "Test Description",
      validMetadata
    );
    channelManager.setHook(channelId, address(hook));
    vm.stopPrank();
  }

  function test_InitializeWithMissingTokenAddress() public {
    string memory invalidMetadata = string.concat(
      '{"tokenCreator":"',
      _addressToString(tokenCreator),
      '","tokenChainId":"',
      vm.toString(tokenChainId),
      '"}'
    );

    vm.startPrank(channelManager.owner());
    channelManager.updateChannel(
      channelId,
      "Test Channel",
      "Test Description",
      invalidMetadata
    );
    vm.expectRevert(TokenCreatorHook.InvalidMetadata.selector);

    channelManager.setHook(channelId, address(hook));
    vm.stopPrank();
  }

  function test_InitializeWithMissingTokenCreator() public {
    string memory invalidMetadata = string.concat(
      '{"tokenAddress":"',
      _addressToString(tokenAddress),
      '","tokenChainId":"',
      vm.toString(tokenChainId),
      '"}'
    );

    vm.startPrank(channelManager.owner());
    channelManager.updateChannel(
      channelId,
      "Test Channel",
      "Test Description",
      invalidMetadata
    );
    vm.expectRevert(TokenCreatorHook.InvalidMetadata.selector);

    channelManager.setHook(channelId, address(hook));
    vm.stopPrank();
  }

  function test_InitializeWithMissingTokenChainId() public {
    string memory invalidMetadata = string.concat(
      '{"tokenAddress":"',
      _addressToString(tokenAddress),
      '","tokenCreator":"',
      _addressToString(tokenCreator),
      '"}'
    );

    vm.startPrank(channelManager.owner());
    channelManager.updateChannel(
      channelId,
      "Test Channel",
      "Test Description",
      invalidMetadata
    );
    vm.expectRevert(TokenCreatorHook.InvalidMetadata.selector);

    channelManager.setHook(channelId, address(hook));
    vm.stopPrank();
  }

  function test_InitializeWithValidMetadata() public {
    vm.startPrank(channelManager.owner());
    channelManager.updateChannel(
      channelId,
      "Test Channel",
      "Test Description",
      validMetadata
    );
    channelManager.setHook(channelId, address(hook));
    vm.stopPrank();

    // Verify stored data
    TokenCreatorHook.TokenInfo memory tokenInfo = hook.getChannelTokenInfo(
      channelId
    );
    assertEq(tokenInfo.tokenAddress, tokenAddress);
    assertEq(tokenInfo.tokenCreator, tokenCreator);
    assertEq(tokenInfo.tokenChainId, tokenChainId);
  }

  function test_TokenCreatorCanPostTopLevelComment() public {
    // Create valid CAIP-19 URI
    string memory validTargetUri = string.concat(
      "eip155:",
      vm.toString(tokenChainId),
      "/erc20:",
      _addressToString(tokenAddress)
    );

    // Create comment data
    Comments.CreateComment memory commentData = Comments.CreateComment({
      author: tokenCreator,
      app: tokenCreator,
      channelId: channelId,
      parentId: bytes32(0),
      content: "Test comment",
      metadata: new Comments.MetadataEntry[](0),
      targetUri: validTargetUri,
      commentType: 0, // COMMENT_TYPE_COMMENT,
      deadline: block.timestamp + 1 hours
    });

    // Post comment as token creator
    vm.prank(tokenCreator);
    commentManager.postComment(commentData, "");
  }

  function test_AnyoneCanReplyToTokenCreatorComment() public {
    // First create a parent comment as token creator
    string memory validTargetUri = string.concat(
      "eip155:",
      vm.toString(tokenChainId),
      "/erc20:",
      _addressToString(tokenAddress)
    );

    Comments.CreateComment memory parentComment = Comments.CreateComment({
      author: tokenCreator,
      app: tokenCreator,
      channelId: channelId,
      parentId: bytes32(0),
      content: "Parent comment",
      metadata: new Comments.MetadataEntry[](0),
      targetUri: validTargetUri,
      commentType: 0, // COMMENT_TYPE_COMMENT,
      deadline: block.timestamp + 1 hours
    });

    vm.prank(tokenCreator);
    commentManager.postComment(parentComment, "");

    // Now create a reply as someone else
    address replier = makeAddr("replier");
    Comments.CreateComment memory replyData = Comments.CreateComment({
      author: replier,
      app: replier,
      channelId: channelId,
      parentId: commentManager.getCommentId(parentComment),
      content: "Reply comment",
      metadata: new Comments.MetadataEntry[](0),
      targetUri: "", // No target URI needed for replies
      commentType: 0, // COMMENT_TYPE_COMMENT,
      deadline: block.timestamp + 1 hours
    });

    vm.prank(replier);
    commentManager.postComment(replyData, "");
  }

  function test_TokenCreatorCannotPostInvalidCAIP19() public {
    // Create invalid CAIP-19 URI (wrong chain ID)
    string memory invalidTargetUri = string.concat(
      "eip155:2/erc20:", // Wrong chain ID
      _addressToString(tokenAddress)
    );

    // Create comment data
    Comments.CreateComment memory commentData = Comments.CreateComment({
      author: tokenCreator,
      app: tokenCreator,
      channelId: channelId,
      parentId: bytes32(0),
      content: "Test comment",
      metadata: new Comments.MetadataEntry[](0),
      targetUri: invalidTargetUri,
      commentType: 0, // COMMENT_TYPE_COMMENT,
      deadline: block.timestamp + 1 hours
    });

    // Attempt to post comment
    vm.prank(tokenCreator);
    vm.expectRevert(TokenCreatorHook.InvalidTargetUri.selector);
    commentManager.postComment(commentData, "");
  }

  function test_NonTokenCreatorCannotPostTopLevelComment() public {
    // Create valid CAIP-19 URI
    string memory validTargetUri = string.concat(
      "eip155:",
      vm.toString(tokenChainId),
      "/erc20:",
      _addressToString(tokenAddress)
    );

    // Create comment data
    Comments.CreateComment memory commentData = Comments.CreateComment({
      author: makeAddr("nonCreator"),
      app: makeAddr("nonCreator"),
      channelId: channelId,
      parentId: bytes32(0),
      content: "Test comment",
      metadata: new Comments.MetadataEntry[](0),
      targetUri: validTargetUri,
      commentType: 0, // COMMENT_TYPE_COMMENT,
      deadline: block.timestamp + 1 hours
    });

    // Attempt to post comment as non-creator
    vm.prank(makeAddr("nonCreator"));
    vm.expectRevert(TokenCreatorHook.UnauthorizedCommenter.selector);
    commentManager.postComment(commentData, "");
  }

  // Helper functions
  function _createChannelData(
    string memory metadata
  ) internal pure returns (Channels.Channel memory) {
    return
      Channels.Channel({
        name: "",
        description: "",
        metadata: metadata,
        hook: address(0),
        permissions: Hooks.Permissions({
          onInitialize: false,
          onCommentAdd: false,
          onCommentEdit: false,
          onCommentDelete: false,
          onChannelUpdate: false,
          onCommentHookDataUpdate: false
        })
      });
  }

  function _addressToString(
    address addr
  ) internal pure returns (string memory) {
    return Strings.toHexString(uint256(uint160(addr)), 20);
  }

  function _char(bytes1 b) internal pure returns (bytes1) {
    if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
    else return bytes1(uint8(b) + 0x57);
  }
}
