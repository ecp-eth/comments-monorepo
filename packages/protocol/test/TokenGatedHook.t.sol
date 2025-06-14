// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { IChannelManager } from "../src/interfaces/IChannelManager.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { TestUtils } from "./utils.sol";
import { BaseHook } from "../src/hooks/BaseHook.sol";
import { Hooks } from "../src/libraries/Hooks.sol";
import { Comments } from "../src/libraries/Comments.sol";
import { Metadata } from "../src/libraries/Metadata.sol";

// Token contract for testing
contract TestToken is ERC20 {
  constructor() ERC20("Test Token", "TEST") {
    _mint(msg.sender, 1000000 * 10 ** 18); // Mint 1M tokens to deployer
  }
}

// Token gating hook contract
contract TokenGatedHook is BaseHook {
  ERC20 public token;
  uint256 public requiredBalance;
  error NotEnoughTokens();

  constructor(address _token, uint256 _requiredBalance) {
    token = ERC20(_token);
    requiredBalance = _requiredBalance;
  }

  function _onCommentAdd(
    Comments.Comment calldata commentData,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal view override returns (Metadata.MetadataEntry[] memory) {
    // Check if the comment author has enough tokens
    uint256 balance = token.balanceOf(commentData.author);
    if (balance < requiredBalance) revert NotEnoughTokens();
    return new Metadata.MetadataEntry[](0);
  }

  function _getHookPermissions()
    internal
    pure
    override
    returns (Hooks.Permissions memory)
  {
    return
      Hooks.Permissions({
        onInitialize: false,
        onCommentAdd: true,
        onCommentDelete: false,
        onCommentEdit: false,
        onChannelUpdate: false,
        onCommentHookDataUpdate: false
      });
  }
}

contract TokenGatedHookTest is Test, IERC721Receiver {
  using TestUtils for string;

  CommentManager public comments;
  ChannelManager public channelManager;
  TokenGatedHook public tokenGatedHook;
  TestToken public testToken;

  address public owner;
  address public user1;
  address public user2;

  function setUp() public {
    owner = address(this);
    user1 = makeAddr("user1");
    user2 = makeAddr("user2");

    // Deploy test token
    testToken = new TestToken();

    // Deploy token gated hook with 1000 token requirement
    tokenGatedHook = new TokenGatedHook(address(testToken), 1000 * 10 ** 18);

    (comments, channelManager) = TestUtils.createContracts(owner);

    vm.deal(user1, 100 ether);
    vm.deal(user2, 100 ether);
  }

  function test_TokenGatedHookAllowsCommentWithEnoughTokens() public {
    // Create channel with token gated hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Token Gated Channel",
      "Must hold 1000 TEST tokens to comment",
      new Metadata.MetadataEntry[](0),
      address(tokenGatedHook)
    );

    // Transfer 1000 tokens to user1
    testToken.transfer(user1, 1000 * 10 ** 18);

    // Create comment data
    Comments.CreateComment memory commentData = Comments.CreateComment({
      content: "Test comment",
      metadata: new Metadata.MetadataEntry[](0),
      targetUri: "",
      commentType: 0, // COMMENT_TYPE_COMMENT,
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    // Post comment as author - should succeed
    bytes memory appSignature = TestUtils.generateAppSignature(
      vm,
      commentData,
      comments
    );
    vm.prank(user1);
    comments.postComment{ value: 0.01 ether }(commentData, appSignature);
  }

  function test_TokenGatedHookBlocksCommentWithoutEnoughTokens() public {
    // Create channel with token gated hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Token Gated Channel",
      "Must hold 1000 TEST tokens to comment",
      new Metadata.MetadataEntry[](0),
      address(tokenGatedHook)
    );

    // Transfer only 999 tokens to user1 (not enough)
    testToken.transfer(user1, 999 * 10 ** 18);

    // Create comment data
    Comments.CreateComment memory commentData = Comments.CreateComment({
      content: "Test comment",
      metadata: new Metadata.MetadataEntry[](0),
      targetUri: "",
      commentType: 0, // COMMENT_TYPE_COMMENT,
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    // Post comment as author - should fail
    bytes memory appSignature = TestUtils.generateAppSignature(
      vm,
      commentData,
      comments
    );
    vm.prank(user1);
    vm.expectRevert(TokenGatedHook.NotEnoughTokens.selector);
    comments.postComment{ value: 0.01 ether }(commentData, appSignature);
  }

  function test_TokenGatedHookAllowsCommentAfterReceivingTokens() public {
    // Create channel with token gated hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Token Gated Channel",
      "Must hold 1000 TEST tokens to comment",
      new Metadata.MetadataEntry[](0),
      address(tokenGatedHook)
    );

    // Create comment data
    Comments.CreateComment memory commentData = Comments.CreateComment({
      content: "Test comment",
      metadata: new Metadata.MetadataEntry[](0),
      targetUri: "",
      commentType: 0, // COMMENT_TYPE_COMMENT,
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    // First try without tokens - should fail
    bytes memory appSignature = TestUtils.generateAppSignature(
      vm,
      commentData,
      comments
    );
    vm.prank(user1);
    vm.expectRevert(TokenGatedHook.NotEnoughTokens.selector);
    comments.postComment{ value: 0.01 ether }(commentData, appSignature);

    // Transfer 1000 tokens to user1
    testToken.transfer(user1, 1000 * 10 ** 18);

    // Try again with tokens - should succeed
    appSignature = TestUtils.generateAppSignature(vm, commentData, comments);
    vm.prank(user1);
    comments.postComment{ value: 0.01 ether }(commentData, appSignature);
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
