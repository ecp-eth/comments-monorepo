// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test, console } from "forge-std/Test.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { TestUtils, MockHook } from "../test/utils.sol";
import { Comments } from "../src/libraries/Comments.sol";
import { Hooks } from "../src/libraries/Hooks.sol";

/// @notice This script is used to debug the gas usage of the ChannelManager and CommentManager contracts.
/// @dev This script is not used in the protocol and should not be used in production.
contract DebugGasUsage is Test, IERC721Receiver {
  CommentManager public comments;
  ChannelManager public channelManager;
  MockHook public mockHook;

  address public owner;
  address public user1;
  address public user2;
  uint256 public user1PrivateKey;
  uint256 public user2PrivateKey;

  uint256 channelId;
  Comments.Comment commentData;
  Comments.CreateComment createCommentData;
  bytes authorSignature;
  bytes appSignature;
  bytes32 commentId;
  Comments.EditComment editData;

  function setUp() public {
    owner = address(this);
    (address _user1, uint256 _user1PrivateKey) = makeAddrAndKey("user1");
    (address _user2, uint256 _user2PrivateKey) = makeAddrAndKey("user2");

    user1 = _user1;
    user1PrivateKey = _user1PrivateKey;
    user2 = _user2;
    user2PrivateKey = _user2PrivateKey;

    (comments, channelManager) = TestUtils.createContracts(owner);

    vm.deal(address(this), 10 ether);
  }

  function run() public {
    debugSetupChannel();
    debugConstructChannelManager();
    debugCreateChannel();
    debugUpdateChannel();
    debugPostCommentBroadcastedByAuthor();
    debugPostCommentSignedByAuthor();
    debugEditCommentBroadcastedByAuthor();
    debugEditCommentSignedByAuthor();
    debugDeleteCommentBroadcastedByAuthor();
    debugDeleteCommentSignedByAuthor();
    debugDeleteCommentSignedByApp();
    debugParseCAIP19();
  }

  function debugSetupChannel() public {
    mockHook = new MockHook();

    // Create channel with hook
    channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Description",
      "{}",
      address(mockHook)
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
    channelManager.createChannel{ value: 0.02 ether }(
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

  function debugPostCommentBroadcastedByAuthor() public {
    // Create comment data using direct construction
    createCommentData = Comments.CreateComment({
      content: "Test comment 1",
      metadata: "{}",
      targetUri: "",
      commentType: "comment",
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    commentId = comments.getCommentId(createCommentData);
    appSignature = TestUtils.signEIP712(vm, user2PrivateKey, commentId);

    // Post comment with sig directly as author
    vm.prank(user1);
    measureGas(
      "postComment broadcasted by author",
      runPostCommentBroadcastedByAuthor
    );
  }

  function runPostCommentBroadcastedByAuthor() internal {
    comments.postComment{ value: 0 }(createCommentData, "", appSignature);
  }

  function debugPostCommentSignedByAuthor() public {
    // Create comment data using direct construction
    createCommentData = Comments.CreateComment({
      content: "Test comment 2",
      metadata: "{}",
      targetUri: "",
      commentType: "comment",
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    commentId = comments.getCommentId(createCommentData);
    authorSignature = TestUtils.signEIP712(vm, user1PrivateKey, commentId);
    appSignature = TestUtils.signEIP712(vm, user2PrivateKey, commentId);

    // Post comment directly as author
    vm.prank(address(0xdead));
    measureGas("postComment signed by author", runPostCommentSignedByAuthor);
  }

  function runPostCommentSignedByAuthor() internal {
    comments.postComment{ value: 0 }(
      createCommentData,
      authorSignature,
      appSignature
    );
  }

  function debugEditCommentBroadcastedByAuthor() public {
    // Create comment data using direct construction
    createCommentData = Comments.CreateComment({
      content: "Test comment 3",
      metadata: "{}",
      targetUri: "",
      commentType: "comment",
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    commentId = comments.getCommentId(createCommentData);
    appSignature = TestUtils.signEIP712(vm, user2PrivateKey, commentId);

    // Post comment
    vm.prank(user1);
    comments.postComment{ value: 0 }(createCommentData, "", appSignature);

    // Sign edit
    editData = Comments.EditComment({
      app: user2,
      content: "Test comment 4",
      metadata: "",
      nonce: comments.getNonce(user1, user2),
      deadline: block.timestamp + 1 days
    });
    bytes32 editHash = comments.getEditCommentHash(commentId, user1, editData);

    appSignature = TestUtils.signEIP712(vm, user2PrivateKey, editHash);

    vm.prank(user1);
    measureGas(
      "editComment broadcasted by author",
      runEditCommentBroadcastedByAuthor
    );
  }

  function runEditCommentBroadcastedByAuthor() internal {
    comments.editComment{ value: 0 }(commentId, editData, "", appSignature);
  }

  function debugEditCommentSignedByAuthor() public {
    // Create comment data using direct construction
    createCommentData = Comments.CreateComment({
      content: "Test comment 5",
      metadata: "{}",
      targetUri: "",
      commentType: "comment",
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    commentId = comments.getCommentId(createCommentData);
    appSignature = TestUtils.signEIP712(vm, user2PrivateKey, commentId);

    // Post comment
    vm.prank(user1);
    comments.postComment{ value: 0 }(createCommentData, "", appSignature);

    // Sign edit
    editData = Comments.EditComment({
      app: user2,
      content: "Test comment 6",
      metadata: "",
      nonce: comments.getNonce(user1, user2),
      deadline: block.timestamp + 1 days
    });
    bytes32 editHash = comments.getEditCommentHash(commentId, user1, editData);

    authorSignature = TestUtils.signEIP712(vm, user1PrivateKey, editHash);
    appSignature = TestUtils.signEIP712(vm, user2PrivateKey, editHash);

    vm.prank(address(0xdead));
    measureGas("editComment signed by author", runEditCommentSignedByAuthor);
  }

  function runEditCommentSignedByAuthor() internal {
    comments.editComment{ value: 0 }(
      commentId,
      editData,
      authorSignature,
      appSignature
    );
  }

  function debugDeleteCommentBroadcastedByAuthor() public {
    // Create comment data using direct construction
    createCommentData = Comments.CreateComment({
      content: "Test comment 7",
      metadata: "{}",
      targetUri: "",
      commentType: "comment",
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    commentId = comments.getCommentId(createCommentData);
    appSignature = TestUtils.signEIP712(vm, user2PrivateKey, commentId);

    // Post comment
    vm.prank(user1);
    comments.postComment{ value: 0 }(createCommentData, "", appSignature);

    vm.prank(user1);
    measureGas(
      "deleteComment broadcasted by author",
      runDeleteCommentBroadcastedByAuthor
    );
  }

  function runDeleteCommentBroadcastedByAuthor() internal {
    comments.deleteComment(
      commentId,
      address(0x0),
      block.timestamp + 1 days,
      "",
      ""
    );
  }

  function debugDeleteCommentSignedByAuthor() public {
    // Create comment data using direct construction
    createCommentData = Comments.CreateComment({
      content: "Test comment 8",
      metadata: "{}",
      targetUri: "",
      commentType: "comment",
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    commentId = comments.getCommentId(createCommentData);
    appSignature = TestUtils.signEIP712(vm, user2PrivateKey, commentId);

    // Post comment
    vm.prank(user1);
    comments.postComment{ value: 0 }(createCommentData, "", appSignature);

    // Sign delete
    bytes32 deleteHash = comments.getDeleteCommentHash(
      commentId,
      user1,
      user2,
      block.timestamp + 1 days
    );

    authorSignature = TestUtils.signEIP712(vm, user1PrivateKey, deleteHash);

    vm.prank(address(0xdead));
    measureGas(
      "deleteComment signed by author",
      runDeleteCommentSignedByAuthor
    );
  }

  function runDeleteCommentSignedByAuthor() internal {
    comments.deleteComment(
      commentId,
      user2,
      block.timestamp + 1 days,
      authorSignature,
      ""
    );
  }

  function debugDeleteCommentSignedByApp() public {
    vm.prank(user1);
    comments.addApproval(user2);

    // Create comment data using direct construction
    createCommentData = Comments.CreateComment({
      content: "Test comment 9",
      metadata: "{}",
      targetUri: "",
      commentType: "comment",
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    commentId = comments.getCommentId(createCommentData);
    appSignature = TestUtils.signEIP712(vm, user2PrivateKey, commentId);

    // Post comment
    vm.prank(user1);
    comments.postComment{ value: 0 }(createCommentData, "", appSignature);

    // Sign delete
    bytes32 deleteHash = comments.getDeleteCommentHash(
      commentId,
      user1,
      user2,
      block.timestamp + 1 days
    );

    appSignature = TestUtils.signEIP712(vm, user2PrivateKey, deleteHash);

    vm.prank(address(0xdead));
    measureGas("deleteComment signed by app", runDeleteCommentSignedByApp);
  }

  function runDeleteCommentSignedByApp() internal {
    comments.deleteComment(
      commentId,
      user2,
      block.timestamp + 1 days,
      "",
      appSignature
    );
  }

  function debugParseCAIP19() public {
    measureGas("parseCAIP19", runParseCAIP19);
  }

  function runParseCAIP19() internal pure {
    // Test a single CAIP-19 URL parse operation
    string
      memory testCase = "eip155:1/erc721:0x06012c8cf97BEaD5deAe237070F9587f8E7A266d/771769"; // CryptoKitties Collectible
    (TestUtils.CAIP19Components memory components, bool valid) = TestUtils
      .parseCAIP19(testCase);
    require(valid, "Invalid CAIP-19 URL");
    console.log("Parsed CAIP-19 URL:", testCase);
    console.log("Chain ID:", components.chainId);
    console.log("Asset Namespace:", components.assetNamespace);
    console.log("Asset Reference:", components.assetReference);
    console.log("Token ID:", components.tokenId);
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
