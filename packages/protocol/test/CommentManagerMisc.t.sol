// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { Comments } from "../src/libraries/Comments.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { ICommentManager } from "../src/interfaces/ICommentManager.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { TestUtils } from "./utils.sol";
import { BaseHook } from "../src/hooks/BaseHook.sol";
import { Hooks } from "../src/libraries/Hooks.sol";

contract CommentsTest is Test, IERC721Receiver {
  event ApprovalAdded(address indexed approver, address indexed approved);
  event ApprovalRemoved(address indexed approver, address indexed approved);

  CommentManager public comments;
  ChannelManager public channelManager;

  // Test accounts
  address public owner;
  address public author;
  address public app;
  uint256 public authorPrivateKey = 0x1;
  uint256 public appPrivateKey = 0x2;
  uint256 public wrongPrivateKey = 0x3;

  function setUp() public {
    owner = address(this);
    author = vm.addr(authorPrivateKey);
    app = vm.addr(appPrivateKey);

    (comments, channelManager) = TestUtils.createContracts(owner);

    // Setup private keys for signing
    vm.deal(author, 100 ether);
    vm.deal(app, 100 ether);
  }

  function test_AddApprovalAsAuthor() public {
    vm.prank(author);
    vm.expectEmit(true, true, true, true);
    emit ApprovalAdded(author, app);
    comments.addApprovalAsAuthor(app);

    assertTrue(comments.isApproved(author, app));
  }

  function test_revokeApprovalAsAuthor() public {
    // First add approval
    vm.prank(author);
    comments.addApprovalAsAuthor(app);

    // Then remove it
    vm.prank(author);
    vm.expectEmit(true, true, true, true);
    emit ApprovalRemoved(author, app);
    comments.revokeApprovalAsAuthor(app);

    assertFalse(comments.isApproved(author, app));
  }

  function test_AddApproval_WithSignature() public {
    uint256 nonce = 0;
    uint256 deadline = block.timestamp + 1 days;

    bytes32 addApprovalHash = comments.getAddApprovalHash(
      author,
      app,
      nonce,
      deadline
    );
    bytes memory signature = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      addApprovalHash
    );

    vm.prank(author);
    vm.expectEmit(true, true, true, true);
    emit ApprovalAdded(author, app);
    comments.addApproval(author, app, nonce, deadline, signature);

    assertTrue(comments.isApproved(author, app));
  }

  function test_revokeApproval_WithSignature() public {
    // First add approval
    vm.prank(author);
    comments.addApprovalAsAuthor(app);

    uint256 nonce = 0;
    uint256 deadline = block.timestamp + 1 days;

    bytes32 removeHash = comments.getRemoveApprovalHash(
      author,
      app,
      nonce,
      deadline
    );
    bytes memory signature = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      removeHash
    );

    vm.prank(author);
    vm.expectEmit(true, true, true, true);
    emit ApprovalRemoved(author, app);
    comments.removeApproval(author, app, nonce, deadline, signature);

    assertFalse(comments.isApproved(author, app));
  }

  function test_AddApproval_InvalidNonce() public {
    uint256 wrongNonce = 1;
    uint256 deadline = block.timestamp + 1 days;

    bytes32 addApprovalHash = comments.getAddApprovalHash(
      author,
      app,
      wrongNonce,
      deadline
    );
    bytes memory signature = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      addApprovalHash
    );

    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.InvalidNonce.selector,
        author,
        app,
        0,
        1
      )
    );
    comments.addApproval(author, app, wrongNonce, deadline, signature);
  }

  function test_revokeApproval_InvalidNonce() public {
    vm.prank(author);
    comments.addApprovalAsAuthor(app);

    uint256 wrongNonce = 1;
    uint256 deadline = block.timestamp + 1 days;

    bytes32 removeApprovalHash = comments.getRemoveApprovalHash(
      author,
      app,
      wrongNonce,
      deadline
    );
    bytes memory signature = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      removeApprovalHash
    );

    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.InvalidNonce.selector,
        author,
        app,
        0,
        1
      )
    );
    comments.removeApproval(author, app, wrongNonce, deadline, signature);
  }

  function test_ApprovalLifecycle() public {
    // Add approval
    vm.prank(author);
    comments.addApprovalAsAuthor(app);
    assertTrue(comments.isApproved(author, app));

    // Post comment without author signature (using approval)
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(comments, author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    comments.postCommentWithApproval(commentData, bytes(""), appSignature);

    // Remove approval
    vm.prank(author);
    comments.revokeApprovalAsAuthor(app);
    assertFalse(comments.isApproved(author, app));

    // Try to post again without approval (should fail)
    commentData.nonce = comments.getNonce(author, app);
    commentId = comments.getCommentId(commentData);
    appSignature = TestUtils.signEIP712(vm, appPrivateKey, commentId);

    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.NotAuthorized.selector,
        address(this),
        author
      )
    );
    comments.postCommentWithApproval(commentData, bytes(""), appSignature);
  }

  function test_NonceIncrement() public {
    uint256 initialNonce = comments.getNonce(author, app);

    // Post comment
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(comments, author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory authorSignature = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      commentId
    );
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    comments.postCommentWithApproval(
      commentData,
      authorSignature,
      appSignature
    );

    assertEq(comments.getNonce(author, app), initialNonce + 1);

    // Try to reuse the same nonce
    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.InvalidNonce.selector,
        author,
        app,
        initialNonce + 1,
        initialNonce
      )
    );
    comments.postCommentWithApproval(
      commentData,
      authorSignature,
      appSignature
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

// Mock malicious fee collector that reverts on collection
contract MaliciousFeeCollector is BaseHook {
  function _onCommentAdded(
    Comments.Comment calldata,
    address,
    bytes32
  ) internal pure override returns (string memory) {
    revert("Malicious revert");
  }

  function _getHookPermissions()
    internal
    pure
    override
    returns (Hooks.Permissions memory)
  {
    return
      Hooks.Permissions({
        onCommentAdded: true,
        onCommentDeleted: false,
        onInitialized: false,
        onCommentEdited: false,
        onChannelUpdated: false
      });
  }
}
