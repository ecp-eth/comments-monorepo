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
  event CommentAdded(
    bytes32 indexed commentId,
    address indexed author,
    address indexed app,
    uint256 channelId,
    bytes32 parentId,
    uint64 createdAt,
    string content,
    string metadata,
    string targetUri,
    string commentType,
    string hookData
  );

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

  function test_AddApproval() public {
    vm.prank(author);
    vm.expectEmit(true, true, true, true);
    emit ApprovalAdded(author, app);
    comments.addApproval(app);

    assertTrue(comments.isApproved(author, app));
  }

  function test_revokeApproval() public {
    // First add approval
    vm.prank(author);
    comments.addApproval(app);

    // Then remove it
    vm.prank(author);
    vm.expectEmit(true, true, true, true);
    emit ApprovalRemoved(author, app);
    comments.revokeApproval(app);

    assertFalse(comments.isApproved(author, app));
  }

  function test_AddApproval_WithSignature() public {
    uint256 nonce = 0;
    uint64 deadline = uint64(block.timestamp + 1 days);

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
    comments.addApprovalWithSig(author, app, nonce, deadline, signature);

    assertTrue(comments.isApproved(author, app));
  }

  function test_revokeApproval_WithSignature() public {
    // First add approval
    vm.prank(author);
    comments.addApproval(app);

    uint256 nonce = 0;
    uint64 deadline = uint64(block.timestamp + 1 days);

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
    comments.removeApprovalWithSig(author, app, nonce, deadline, signature);

    assertFalse(comments.isApproved(author, app));
  }

  function test_AddApproval_InvalidNonce() public {
    uint256 wrongNonce = 1;
    uint64 deadline = uint64(block.timestamp + 1 days);

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
    comments.addApprovalWithSig(author, app, wrongNonce, deadline, signature);
  }

  function test_revokeApproval_InvalidNonce() public {
    vm.prank(author);
    comments.addApproval(app);

    uint256 wrongNonce = 1;
    uint64 deadline = uint64(block.timestamp + 1 days);

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
    comments.removeApprovalWithSig(
      author,
      app,
      wrongNonce,
      deadline,
      signature
    );
  }

  function test_ApprovalLifecycle() public {
    // Add approval
    vm.prank(author);
    comments.addApproval(app);
    assertTrue(comments.isApproved(author, app));

    // Post comment without author signature (using approval)
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    comments.postCommentWithSig(commentData, bytes(""), appSignature);

    // Remove approval
    vm.prank(author);
    comments.revokeApproval(app);
    assertFalse(comments.isApproved(author, app));

    // Try to post again without approval (should fail)
    commentId = comments.getCommentId(commentData);
    appSignature = TestUtils.signEIP712(vm, appPrivateKey, commentId);

    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.NotAuthorized.selector,
        address(this),
        author
      )
    );
    comments.postCommentWithSig(commentData, bytes(""), appSignature);
  }

  function test_NonceNotIncrement() public {
    uint256 initialNonce = comments.getNonce(author, app);

    // Post comment
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
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

    comments.postCommentWithSig(commentData, authorSignature, appSignature);

    assertEq(comments.getNonce(author, app), initialNonce);

    vm.expectEmit(true, true, true, true);
    emit CommentAdded(
      commentId,
      author,
      app,
      0,
      commentData.parentId,
      uint64(block.timestamp),
      commentData.content,
      commentData.metadata,
      commentData.targetUri,
      commentData.commentType,
      ""
    );
    comments.postCommentWithSig(commentData, authorSignature, appSignature);
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
  function _onCommentAdd(
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
        onCommentAdd: true,
        onCommentDelete: false,
        onInitialize: false,
        onCommentEdit: false,
        onChannelUpdate: false
      });
  }
}
