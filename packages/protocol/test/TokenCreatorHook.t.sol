// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { TokenCreatorHook } from "../src/hooks/TokenCreatorHook.sol";
import { Channels } from "../src/types/Channels.sol";
import { Comments } from "../src/types/Comments.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { IHook } from "../src/interfaces/IHook.sol";
import { Hooks } from "../src/types/Hooks.sol";
import { Metadata } from "../src/types/Metadata.sol";
import { console } from "forge-std/console.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Token contract for testing
contract TestToken is ERC20 {
  constructor() ERC20("Test Token", "TEST") {
    _mint(msg.sender, 1000000 * 10 ** 18);
  }
}

contract TokenCreatorHookTest is Test {
  TokenCreatorHook public hook;
  CommentManager public commentManager;
  ChannelManager public channelManager;
  address public tokenAddress;
  address public tokenCreator;
  uint256 public tokenChainId;
  uint256 public channelId;
  Metadata.MetadataEntry[] public validMetadata;
  Metadata.MetadataEntryOp[] public validMetadataOps;
  ERC20 public testToken;

  function setUp() public {
    // Deploy contracts
    address initialOwner = makeAddr("owner");
    vm.startPrank(initialOwner);

    // Give the initialOwner some ETH
    vm.deal(initialOwner, 1 ether);

    channelManager = new ChannelManager(initialOwner);
    commentManager = new CommentManager(initialOwner);

    // Set up cross-contract references
    commentManager.updateChannelContract(address(channelManager));

    // Deploy and set up hook
    hook = new TokenCreatorHook();
    testToken = new TestToken();
    tokenAddress = address(testToken);
    tokenCreator = makeAddr("creator");
    tokenChainId = 1; // Ethereum mainnet

    // Create valid metadata JSON
    validMetadata = new Metadata.MetadataEntry[](3);
    validMetadata[0] = Metadata.MetadataEntry({
      key: "string tokenAddress",
      value: abi.encode(tokenAddress)
    });
    validMetadata[1] = Metadata.MetadataEntry({
      key: "string tokenCreator",
      value: abi.encode(tokenCreator)
    });
    validMetadata[2] = Metadata.MetadataEntry({
      key: "string tokenChainId",
      value: abi.encode(tokenChainId)
    });
    validMetadataOps = new Metadata.MetadataEntryOp[](3);
    validMetadataOps[0] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: "string tokenAddress",
      value: abi.encode(tokenAddress)
    });
    validMetadataOps[1] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: "string tokenCreator",
      value: abi.encode(tokenCreator)
    });
    validMetadataOps[2] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: "string tokenChainId",
      value: abi.encode(tokenChainId)
    });

    // Create a channel with the hook
    // First create the channel
    channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Test Description",
      validMetadata,
      address(0) // Initially no hook
    );

    channelManager.setHook(channelId, address(hook));
    vm.stopPrank();
  }

  function test_InitializeWithMissingTokenAddress() public {
    Metadata.MetadataEntryOp[]
      memory invalidMetadata = new Metadata.MetadataEntryOp[](3);
    invalidMetadata[0] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: "string tokenCreator",
      value: abi.encode(tokenCreator)
    });
    invalidMetadata[1] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: "string tokenChainId",
      value: abi.encode(tokenChainId)
    });
    invalidMetadata[2] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.DELETE,
      key: "string tokenAddress",
      value: abi.encode(tokenAddress)
    });

    vm.startPrank(channelManager.owner());
    channelManager.updateChannel(
      channelId,
      "Test Channel",
      "Test Description",
      invalidMetadata
    );
    vm.expectRevert(TokenCreatorHook.InvalidTokenAddress.selector);

    channelManager.setHook(channelId, address(hook));
    vm.stopPrank();
  }

  function test_InitializeWithMissingTokenCreator() public {
    Metadata.MetadataEntryOp[]
      memory invalidMetadata = new Metadata.MetadataEntryOp[](3);
    invalidMetadata[0] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: "string tokenAddress",
      value: abi.encode(tokenAddress)
    });
    invalidMetadata[1] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: "string tokenChainId",
      value: abi.encode(tokenChainId)
    });
    invalidMetadata[2] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.DELETE,
      key: "string tokenCreator",
      value: abi.encode(tokenCreator)
    });

    vm.startPrank(channelManager.owner());
    channelManager.updateChannel(
      channelId,
      "Test Channel",
      "Test Description",
      invalidMetadata
    );
    vm.expectRevert(TokenCreatorHook.InvalidTokenCreator.selector);

    channelManager.setHook(channelId, address(hook));
    vm.stopPrank();
  }

  function test_InitializeWithMissingTokenChainId() public {
    Metadata.MetadataEntryOp[]
      memory invalidMetadata = new Metadata.MetadataEntryOp[](3);
    invalidMetadata[0] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: "string tokenAddress",
      value: abi.encode(tokenAddress)
    });
    invalidMetadata[1] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: "string tokenCreator",
      value: abi.encode(tokenCreator)
    });
    invalidMetadata[2] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.DELETE,
      key: "string tokenChainId",
      value: abi.encode(tokenChainId)
    });

    vm.startPrank(channelManager.owner());
    channelManager.updateChannel(
      channelId,
      "Test Channel",
      "Test Description",
      invalidMetadata
    );
    vm.expectRevert(TokenCreatorHook.InvalidTokenChainId.selector);

    channelManager.setHook(channelId, address(hook));
    vm.stopPrank();
  }

  function test_InitializeWithValidMetadata() public {
    vm.startPrank(channelManager.owner());
    channelManager.updateChannel(
      channelId,
      "Test Channel",
      "Test Description",
      validMetadataOps
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
      metadata: new Metadata.MetadataEntry[](0),
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
      metadata: new Metadata.MetadataEntry[](0),
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
      metadata: new Metadata.MetadataEntry[](0),
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
      metadata: new Metadata.MetadataEntry[](0),
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
      metadata: new Metadata.MetadataEntry[](0),
      targetUri: validTargetUri,
      commentType: 0, // COMMENT_TYPE_COMMENT,
      deadline: block.timestamp + 1 hours
    });

    // Attempt to post comment as non-creator
    vm.prank(makeAddr("nonCreator"));
    vm.expectRevert(TokenCreatorHook.UnauthorizedCommenter.selector);
    commentManager.postComment(commentData, "");
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
