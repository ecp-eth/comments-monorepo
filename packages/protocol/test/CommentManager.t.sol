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

error TestHookRejected();

contract NoHook is BaseHook {
  function getHookPermissions()
    external
    pure
    override
    returns (Hooks.Permissions memory)
  {
    return
      Hooks.Permissions({
        afterInitialize: false,
        afterComment: false,
        afterDeleteComment: false,
        afterEditComment: false,
        onChannelUpdated: false
      });
  }
}

contract RejectEditHook is BaseHook {
  function getHookPermissions()
    external
    pure
    override
    returns (Hooks.Permissions memory)
  {
    return
      Hooks.Permissions({
        afterInitialize: false,
        afterComment: false,
        afterDeleteComment: false,
        afterEditComment: true,
        onChannelUpdated: false
      });
  }

  function afterEditComment(
    Comments.Comment calldata,
    address,
    bytes32
  ) external payable override returns (string memory) {
    revert TestHookRejected();
  }
}

contract AlwaysReturningDataHook is BaseHook {
  function getHookPermissions()
    external
    pure
    override
    returns (Hooks.Permissions memory)
  {
    return
      Hooks.Permissions({
        afterInitialize: false,
        afterComment: true,
        afterDeleteComment: false,
        afterEditComment: true,
        onChannelUpdated: false
      });
  }

  function afterEditComment(
    Comments.Comment calldata,
    address,
    bytes32
  ) external payable override returns (string memory) {
    return "hook data";
  }

  function afterComment(
    Comments.Comment calldata,
    address,
    bytes32
  ) external payable override returns (string memory) {
    return "hook data";
  }
}

contract CommentsTest is Test, IERC721Receiver {
  event CommentAdded(
    bytes32 indexed commentId,
    address indexed author,
    address indexed app,
    Comments.Comment commentData
  );
  event CommentDeleted(bytes32 indexed commentId, address indexed author);
  event ApprovalAdded(address indexed approver, address indexed approved);
  event ApprovalRemoved(address indexed approver, address indexed approved);
  event CommentEdited(
    bytes32 indexed commentId,
    address indexed author,
    address indexed app,
    Comments.Comment commentData
  );
  event CommentHookDataUpdated(bytes32 indexed commentId, string hookData);
  CommentManager public comments;
  NoHook public noHook;
  RejectEditHook public rejectEditHook;
  AlwaysReturningDataHook public alwaysReturningDataHook;
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
    noHook = new NoHook();
    rejectEditHook = new RejectEditHook();
    alwaysReturningDataHook = new AlwaysReturningDataHook();
    (comments, channelManager) = TestUtils.createContracts(owner);

    // Setup private keys for signing
    vm.deal(author, 100 ether);
    vm.deal(app, 100 ether);
  }

  function _createBasicCreateComment()
    internal
    view
    returns (Comments.CreateComment memory)
  {
    uint256 nonce = comments.getNonce(author, app);

    return
      Comments.CreateComment({
        content: "Test comment",
        metadata: "{}",
        targetUri: "",
        commentType: "comment",
        author: author,
        app: app,
        channelId: 0,
        nonce: nonce,
        deadline: block.timestamp + 1 days,
        parentId: bytes32(0)
      });
  }

  function test_PostCommentAsAuthor() public {
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    commentData.app = app;

    // Generate app signature
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Send transaction as author
    vm.prank(author);
    comments.postCommentAsAuthor(commentData, appSignature);
  }

  function test_PostCommentAsAuthor_InvalidAuthor() public {
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    commentData.app = app;

    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Send transaction from wrong address
    address wrongAuthor = address(0x3);
    vm.prank(wrongAuthor);
    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.NotAuthorized.selector,
        wrongAuthor,
        author
      )
    );
    comments.postCommentAsAuthor(commentData, appSignature);
  }

  function test_PostCommentAsAuthor_InvalidAppSignature() public {
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    commentData.app = app;

    vm.prank(author);
    comments.addApprovalAsAuthor(app);

    // Send transaction as author
    vm.prank(author);
    vm.expectRevert(ICommentManager.InvalidAppSignature.selector);
    comments.postCommentAsAuthor(commentData, "");
  }

  function test_PostComment() public {
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    commentData.app = app;

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

    comments.postComment(commentData, authorSignature, appSignature);
  }

  function test_PostComment_InvalidAppSignature() public {
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    commentData.app = app;

    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory authorSignature = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      commentId
    );
    bytes memory wrongSignature = TestUtils.signEIP712(vm, 0x3, commentId); // Wrong private key

    vm.expectRevert(ICommentManager.InvalidAppSignature.selector);
    comments.postComment(commentData, authorSignature, wrongSignature);
  }

  function test_DeleteCommentAsAuthor() public {
    // Create and post a comment first
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postCommentAsAuthor(commentData, appSignature);

    // Delete the comment as author
    vm.prank(author);
    vm.expectEmit(true, true, true, true);
    emit CommentDeleted(commentId, author);
    comments.deleteCommentAsAuthor(commentId);

    // Verify comment is deleted
    vm.expectRevert(ICommentManager.CommentDoesNotExist.selector);
    comments.getComment(commentId);
  }

  function test_DeleteComment() public {
    // Create and post a comment first
    Comments.CreateComment memory commentData = _createBasicCreateComment();
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

    comments.postComment(commentData, authorSignature, appSignature);

    // Delete the comment with signature
    bytes32 deleteHash = comments.getDeleteCommentHash(
      commentId,
      author,
      app,
      comments.getNonce(author, app),
      block.timestamp + 1 days
    );
    bytes memory authorDeleteSignature = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      deleteHash
    );

    vm.expectEmit(true, true, true, true);
    emit CommentDeleted(commentId, author);
    comments.deleteComment(
      commentId,
      author,
      app,
      comments.getNonce(author, app),
      block.timestamp + 1 days,
      authorDeleteSignature,
      ""
    );
  }

  function test_DeleteComment_InvalidSignature() public {
    // First create a comment
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postCommentAsAuthor(commentData, appSignature);

    // Try to delete with wrong signature
    uint256 nonce = comments.getNonce(author, app);
    uint256 deadline = block.timestamp + 1 days;
    bytes32 deleteHash = comments.getDeleteCommentHash(
      commentId,
      author,
      app,
      nonce,
      deadline
    );
    bytes memory wrongSignature = TestUtils.signEIP712(
      vm,
      wrongPrivateKey,
      deleteHash
    ); // Wrong signer

    vm.prank(address(0xdead));
    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.NotAuthorized.selector,
        address(0xdead),
        author
      )
    );
    comments.deleteComment(
      commentId,
      author,
      app,
      nonce,
      deadline,
      wrongSignature,
      wrongSignature
    );

    // Verify comment still exists
    assertTrue(comments.getComment(commentId).author != address(0));
  }

  function test_PostCommentAsAuthor_InvalidNonce() public {
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    commentData.nonce = commentData.nonce + 1;

    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.InvalidNonce.selector,
        author,
        app,
        0,
        1
      )
    );
    comments.postCommentAsAuthor(commentData, appSignature);
  }

  function test_PostComment_InvalidNonce() public {
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    commentData.nonce = commentData.nonce + 1;

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

    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.InvalidNonce.selector,
        author,
        app,
        0,
        1
      )
    );
    comments.postComment(commentData, authorSignature, appSignature);
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

  function test_PostComment_WithApproval() public {
    // First add approval
    vm.prank(author);
    comments.addApprovalAsAuthor(app);

    // Create and post comment
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Post comment from any address since we have approval
    comments.postComment(commentData, bytes(""), appSignature);
  }

  function test_PostComment_WithoutApproval() public {
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Should fail without approval or valid signature
    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.NotAuthorized.selector,
        address(this),
        author
      )
    );
    comments.postComment(commentData, bytes(""), appSignature);
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

  function test_DeleteComment_InvalidNonce() public {
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postCommentAsAuthor(commentData, appSignature);

    uint256 wrongNonce = 100;
    uint256 deadline = block.timestamp + 1 days;
    bytes32 deleteHash = comments.getDeleteCommentHash(
      commentId,
      author,
      app,
      wrongNonce,
      deadline
    );
    bytes memory authorDeleteSignature = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      deleteHash
    );

    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.InvalidNonce.selector,
        author,
        app,
        1,
        100
      )
    );
    comments.deleteComment(
      commentId,
      author,
      app,
      wrongNonce,
      deadline,
      authorDeleteSignature,
      ""
    );
  }

  function test_DeleteComment_WithApprovedSigner() public {
    // First add approval
    vm.prank(author);
    comments.addApprovalAsAuthor(app);

    // Create and post a comment
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postCommentAsAuthor(commentData, appSignature);

    // Delete the comment with app signature only
    bytes32 deleteHash = comments.getDeleteCommentHash(
      commentId,
      author,
      app,
      comments.getNonce(author, app),
      block.timestamp + 1 days
    );
    bytes memory appDeleteSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      deleteHash
    );

    vm.expectEmit(true, true, true, true);
    emit CommentDeleted(commentId, author);
    comments.deleteComment(
      commentId,
      author,
      app,
      comments.getNonce(author, app),
      block.timestamp + 1 days,
      bytes(""), // Empty author signature
      appDeleteSignature
    );
  }

  function test_PostComment_WithFeeCollection() public {
    uint256 channelId1 = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Test Description",
      "{}",
      address(noHook)
    );

    Comments.CreateComment memory commentData = _createBasicCreateComment();
    commentData.channelId = channelId1;
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

    // Post comment with fee
    vm.prank(author);
    vm.deal(author, 1 ether);
    comments.postComment{ value: 0.1 ether }(
      commentData,
      authorSignature,
      appSignature
    );
  }

  function test_PostComment_WithInvalidFee() public {
    // Setup fee collector that requires 1 ether
    MaliciousFeeCollector maliciousCollector = new MaliciousFeeCollector();

    uint256 channelId2 = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Test Description",
      "{}",
      address(maliciousCollector)
    );

    Comments.CreateComment memory commentData = _createBasicCreateComment();
    commentData.channelId = channelId2;
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

    // Try to post comment with insufficient fee
    vm.prank(author);
    vm.expectRevert("Malicious revert");
    comments.postComment{ value: 0.1 ether }(
      commentData,
      authorSignature,
      appSignature
    );
  }

  function test_PostComment_WithThreading() public {
    // Post parent comment
    Comments.CreateComment memory parentComment = _createBasicCreateComment();
    bytes32 parentId = comments.getCommentId(parentComment);
    bytes memory parentAuthorSig = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      parentId
    );
    bytes memory parentAppSig = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      parentId
    );

    comments.postComment(parentComment, parentAuthorSig, parentAppSig);

    // Post reply comment
    Comments.CreateComment memory replyComment = _createBasicCreateComment();
    replyComment.nonce = comments.getNonce(author, app); // Update nonce
    replyComment.parentId = parentId; // Set parent ID for reply

    bytes32 replyId = comments.getCommentId(replyComment);
    bytes memory replyAuthorSig = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      replyId
    );
    bytes memory replyAppSig = TestUtils.signEIP712(vm, appPrivateKey, replyId);

    comments.postComment(replyComment, replyAuthorSig, replyAppSig);

    // Verify thread relationship
    Comments.Comment memory storedReply = comments.getComment(replyId);
    assertEq(
      storedReply.parentId,
      parentId,
      "Reply should have correct parent ID"
    );
  }

  function test_PostComment_ExpiredDeadline() public {
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    commentData.deadline = block.timestamp - 1; // Expired deadline

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

    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.SignatureDeadlineReached.selector,
        commentData.deadline,
        block.timestamp
      )
    );
    comments.postComment(commentData, authorSignature, appSignature);
  }

  function test_DeleteComment_NonExistentComment() public {
    bytes32 nonExistentId = bytes32(uint256(1));

    vm.prank(author);
    vm.expectRevert("Comment does not exist");
    comments.deleteCommentAsAuthor(nonExistentId);
  }

  function test_DeleteComment_NotAuthor() public {
    // First create a comment
    Comments.CreateComment memory commentData = _createBasicCreateComment();
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

    comments.postComment(commentData, authorSignature, appSignature);

    // Try to delete as non-author
    address nonAuthor = address(0x4);
    vm.prank(nonAuthor);
    vm.expectRevert("Not comment author");
    comments.deleteCommentAsAuthor(commentId);
  }

  function test_ApprovalLifecycle() public {
    // Add approval
    vm.prank(author);
    comments.addApprovalAsAuthor(app);
    assertTrue(comments.isApproved(author, app));

    // Post comment without author signature (using approval)
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    comments.postComment(commentData, bytes(""), appSignature);

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
    comments.postComment(commentData, bytes(""), appSignature);
  }

  function test_NonceIncrement() public {
    uint256 initialNonce = comments.getNonce(author, app);

    // Post comment
    Comments.CreateComment memory commentData = _createBasicCreateComment();
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

    comments.postComment(commentData, authorSignature, appSignature);

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
    comments.postComment(commentData, authorSignature, appSignature);
  }

  function test_PostComment_ReplyToDeletedComment() public {
    // Post parent comment
    Comments.CreateComment memory parentComment = _createBasicCreateComment();
    bytes32 parentId = comments.getCommentId(parentComment);
    bytes memory parentAuthorSig = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      parentId
    );
    bytes memory parentAppSig = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      parentId
    );

    comments.postComment(parentComment, parentAuthorSig, parentAppSig);

    // Delete the parent comment
    vm.prank(author);
    comments.deleteCommentAsAuthor(parentId);

    // Post reply to deleted comment
    Comments.CreateComment memory replyComment = _createBasicCreateComment();
    replyComment.nonce = comments.getNonce(author, app); // Update nonce
    replyComment.parentId = parentId; // Set parent ID for reply

    bytes32 replyId = comments.getCommentId(replyComment);
    bytes memory replyAuthorSig = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      replyId
    );
    bytes memory replyAppSig = TestUtils.signEIP712(vm, appPrivateKey, replyId);

    // This should succeed even though parent is deleted
    comments.postComment(replyComment, replyAuthorSig, replyAppSig);

    // Verify reply was created with correct parent ID
    Comments.Comment memory storedReply = comments.getComment(replyId);
    assertEq(
      storedReply.parentId,
      parentId,
      "Reply should have correct parent ID"
    );
  }

  function test_PostComment_CannotHaveBothParentIdAndTargetUri() public {
    // First create a parent comment
    Comments.CreateComment memory parentComment = _createBasicCreateComment();
    bytes32 parentId = comments.getCommentId(parentComment);
    bytes memory parentAuthorSig = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      parentId
    );
    bytes memory parentAppSig = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      parentId
    );
    comments.postComment(parentComment, parentAuthorSig, parentAppSig);

    // Create a comment with both parentId and targetUri set
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    commentData.parentId = parentId; // Set the parent ID to the existing comment
    commentData.targetUri = "https://example.com"; // Set a non-empty targetUri in lowercase

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

    // Expect revert when trying to post comment with both parentId and targetUri
    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.InvalidCommentReference.selector,
        "Parent comment and targetUri cannot both be set"
      )
    );
    comments.postComment(commentData, authorSignature, appSignature);
  }

  function test_PostComment_WithHookData() public {
    // Create a channel with the hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Test Description",
      "{}",
      address(alwaysReturningDataHook)
    );

    // Create a comment
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    commentData.channelId = channelId;
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

    vm.expectEmit(true, true, true, true);
    emit CommentAdded(
      commentId,
      author,
      app,
      Comments.Comment({
        author: commentData.author,
        app: commentData.app,
        content: commentData.content,
        commentType: commentData.commentType,
        createdAt: uint80(block.timestamp),
        updatedAt: uint80(block.timestamp),
        metadata: commentData.metadata,
        channelId: commentData.channelId,
        parentId: commentData.parentId,
        targetUri: commentData.targetUri,
        hookData: ""
      })
    );
    vm.expectEmit(true, true, true, true);
    emit CommentHookDataUpdated(commentId, "hook data");
    comments.postComment(commentData, authorSignature, appSignature);

    // Verify the comment was created with hook data
    Comments.Comment memory createdComment = comments.getComment(commentId);
    assertEq(createdComment.hookData, "hook data");
  }

  function _createBasicEditCommentData()
    internal
    view
    returns (Comments.EditComment memory)
  {
    return
      Comments.EditComment({
        content: "Edited content",
        metadata: '{"edited":true}',
        app: app,
        nonce: comments.getNonce(author, app),
        deadline: block.timestamp + 1 days
      });
  }

  function test_EditCommentAsAuthor() public {
    // First create a comment
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postCommentAsAuthor(commentData, appSignature);

    // Now edit the comment
    Comments.EditComment memory editData = _createBasicEditCommentData();
    bytes32 editHash = comments.getEditCommentHash(
      commentId,
      commentData.author,
      editData
    );
    bytes memory editAppSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      editHash
    );

    Comments.Comment memory expectedCommentData = comments.getComment(
      commentId
    );

    expectedCommentData.content = editData.content;
    expectedCommentData.metadata = editData.metadata;
    expectedCommentData.updatedAt = uint80(block.timestamp);

    vm.prank(author);
    vm.expectEmit(true, true, true, true);
    emit CommentEdited(commentId, author, app, expectedCommentData);
    comments.editCommentAsAuthor(commentId, editData, editAppSignature);

    // Verify the comment was edited
    Comments.Comment memory editedComment = comments.getComment(commentId);
    assertEq(editedComment.content, editData.content);
    assertEq(editedComment.metadata, editData.metadata);
    assertEq(editedComment.updatedAt, uint80(block.timestamp));
  }

  function test_EditCommentAsAuthor_UpdatedWithHookData() public {
    // Create a channel with the reject hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Test Description",
      "{}",
      address(alwaysReturningDataHook)
    );

    // Create a comment
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    commentData.channelId = channelId;
    bytes32 commentId = comments.getCommentId(commentData);

    // Post the comment
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );
    vm.prank(author);
    comments.postCommentAsAuthor(commentData, appSignature);

    // Edit the comment
    Comments.EditComment memory editData = _createBasicEditCommentData();
    bytes32 editHash = comments.getEditCommentHash(
      commentId,
      commentData.author,
      editData
    );
    bytes memory editAppSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      editHash
    );

    Comments.Comment memory expectedCommentData = comments.getComment(
      commentId
    );

    expectedCommentData.content = editData.content;
    expectedCommentData.metadata = editData.metadata;
    expectedCommentData.updatedAt = uint80(block.timestamp);

    vm.prank(author);
    vm.expectEmit(true, true, true, true);
    emit CommentEdited(commentId, author, app, expectedCommentData);
    vm.expectEmit(true, true, true, true);
    emit CommentHookDataUpdated(commentId, "hook data");
    comments.editCommentAsAuthor(commentId, editData, editAppSignature);

    // Verify the comment was edited
    Comments.Comment memory editedComment = comments.getComment(commentId);
    assertEq(editedComment.content, editData.content);
    assertEq(editedComment.metadata, editData.metadata);
    assertEq(editedComment.updatedAt, uint80(block.timestamp));
    assertEq(editedComment.hookData, "hook data");
  }

  function test_EditCommentAsAuthor_RejectedByHook() public {
    // Create a channel with the reject hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Test Description",
      "{}",
      address(rejectEditHook)
    );

    // Create a comment
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    commentData.channelId = channelId;
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postCommentAsAuthor(commentData, appSignature);

    // Try to edit the comment
    Comments.EditComment memory editData = _createBasicEditCommentData();
    bytes32 editHash = comments.getEditCommentHash(
      commentId,
      commentData.author,
      editData
    );

    bytes memory editAppSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      editHash
    );

    vm.prank(author);
    vm.expectRevert(TestHookRejected.selector);
    comments.editCommentAsAuthor(commentId, editData, editAppSignature);
  }

  function test_EditCommentAsAuthor_InvalidAuthor() public {
    // First create a comment
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postCommentAsAuthor(commentData, appSignature);

    Comments.Comment memory originalComment = comments.getComment(commentId);

    // Try to edit from wrong address
    Comments.EditComment memory editData = _createBasicEditCommentData();
    bytes32 editHash = comments.getEditCommentHash(
      commentId,
      commentData.author,
      editData
    );
    bytes memory editAppSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      editHash
    );

    address wrongAuthor = address(0x3);
    vm.prank(wrongAuthor);
    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.NotAuthorized.selector,
        wrongAuthor,
        author
      )
    );
    comments.editCommentAsAuthor(commentId, editData, editAppSignature);

    // Verify comment did not change
    Comments.Comment memory editedComment = comments.getComment(commentId);
    assertEq(editedComment.content, originalComment.content);
    assertEq(editedComment.metadata, originalComment.metadata);
    assertEq(editedComment.updatedAt, originalComment.updatedAt);
  }

  function test_EditComment() public {
    // First create a comment
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postCommentAsAuthor(commentData, appSignature);

    // Now edit the comment
    Comments.EditComment memory editData = _createBasicEditCommentData();
    bytes32 editHash = comments.getEditCommentHash(
      commentId,
      commentData.author,
      editData
    );
    bytes memory editAuthorSignature = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      editHash
    );
    bytes memory editAppSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      editHash
    );

    Comments.Comment memory expectedCommentData = comments.getComment(
      commentId
    );

    expectedCommentData.content = editData.content;
    expectedCommentData.metadata = editData.metadata;
    expectedCommentData.updatedAt = uint80(block.timestamp);

    vm.expectEmit(true, true, true, true);
    emit CommentEdited(commentId, author, app, expectedCommentData);
    comments.editComment(
      commentId,
      editData,
      editAuthorSignature,
      editAppSignature
    );

    // Verify the comment was edited
    Comments.Comment memory editedComment = comments.getComment(commentId);
    assertEq(editedComment.content, editData.content);
    assertEq(editedComment.metadata, editData.metadata);
    assertEq(editedComment.updatedAt, uint80(block.timestamp));
  }

  function test_EditComment_InvalidAppSignature() public {
    // First create a comment
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postCommentAsAuthor(commentData, appSignature);

    // Try to edit with wrong app signature
    Comments.EditComment memory editData = _createBasicEditCommentData();
    bytes32 editHash = comments.getEditCommentHash(
      commentId,
      commentData.author,
      editData
    );
    bytes memory editAuthorSignature = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      editHash
    );
    bytes memory wrongAppSignature = TestUtils.signEIP712(
      vm,
      wrongPrivateKey,
      editHash
    );

    vm.expectRevert(ICommentManager.InvalidAppSignature.selector);
    comments.editComment(
      commentId,
      editData,
      editAuthorSignature,
      wrongAppSignature
    );
  }

  function test_EditComment_InvalidNonce() public {
    // First create a comment
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postCommentAsAuthor(commentData, appSignature);

    // Try to edit with wrong nonce
    Comments.EditComment memory editData = _createBasicEditCommentData();
    uint256 goodNonce = editData.nonce;
    editData.nonce = editData.nonce + 1; // Use wrong nonce

    bytes32 editHash = comments.getEditCommentHash(
      commentId,
      commentData.author,
      editData
    );
    bytes memory editAuthorSignature = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      editHash
    );
    bytes memory editAppSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      editHash
    );

    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.InvalidNonce.selector,
        author,
        app,
        goodNonce,
        editData.nonce
      )
    );
    comments.editComment(
      commentId,
      editData,
      editAuthorSignature,
      editAppSignature
    );
  }

  function test_EditComment_WithApproval() public {
    // First add approval
    vm.prank(author);
    comments.addApprovalAsAuthor(app);

    // Create and post a comment
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postCommentAsAuthor(commentData, appSignature);

    // Edit comment with app signature only (using approval)
    Comments.EditComment memory editData = _createBasicEditCommentData();
    bytes32 editHash = comments.getEditCommentHash(
      commentId,
      commentData.author,
      editData
    );
    bytes memory editAppSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      editHash
    );

    Comments.Comment memory expectedCommentData = comments.getComment(
      commentId
    );

    expectedCommentData.content = editData.content;
    expectedCommentData.metadata = editData.metadata;
    expectedCommentData.updatedAt = uint80(block.timestamp);

    vm.expectEmit(true, true, true, true);
    emit CommentEdited(commentId, author, app, expectedCommentData);
    comments.editComment(commentId, editData, bytes(""), editAppSignature);

    // Verify the comment was edited
    Comments.Comment memory editedComment = comments.getComment(commentId);
    assertEq(editedComment.content, editData.content);
    assertEq(editedComment.metadata, editData.metadata);
    assertEq(editedComment.updatedAt, uint80(block.timestamp));
  }

  function test_EditComment_ExpiredDeadline() public {
    // First create a comment
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postCommentAsAuthor(commentData, appSignature);

    // Try to edit with expired deadline
    Comments.EditComment memory editData = _createBasicEditCommentData();
    editData.deadline = block.timestamp - 1; // Set expired deadline

    bytes32 editHash = comments.getEditCommentHash(
      commentId,
      commentData.author,
      editData
    );
    bytes memory editAuthorSignature = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      editHash
    );
    bytes memory editAppSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      editHash
    );

    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.SignatureDeadlineReached.selector,
        editData.deadline,
        block.timestamp
      )
    );
    comments.editComment(
      commentId,
      editData,
      editAuthorSignature,
      editAppSignature
    );
  }

  function test_EditComment_NonExistentComment() public {
    bytes32 nonExistentId = bytes32(uint256(1));
    Comments.EditComment memory editData = _createBasicEditCommentData();
    bytes32 editHash = comments.getEditCommentHash(
      nonExistentId,
      author,
      editData
    );
    bytes memory editAuthorSignature = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      editHash
    );
    bytes memory editAppSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      editHash
    );

    vm.expectRevert("Comment does not exist");
    comments.editComment(
      nonExistentId,
      editData,
      editAuthorSignature,
      editAppSignature
    );
  }

  function test_EditComment_InvalidAuthor() public {
    // First create a comment
    Comments.CreateComment memory commentData = _createBasicCreateComment();
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postCommentAsAuthor(commentData, appSignature);

    // Try to edit with invalid author signature
    Comments.EditComment memory editData = _createBasicEditCommentData();

    bytes32 editHash = comments.getEditCommentHash(
      commentId,
      commentData.author,
      editData
    );
    address wrongAuthor = address(0x3);
    // use signature of wrong author
    bytes memory editAuthorSignature = TestUtils.signEIP712(
      vm,
      wrongPrivateKey,
      editHash
    );
    bytes memory editAppSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      editHash
    );

    vm.prank(wrongAuthor);
    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.NotAuthorized.selector,
        wrongAuthor,
        author
      )
    );
    comments.editComment(
      commentId,
      editData,
      editAuthorSignature,
      editAppSignature
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
  function _afterComment(
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
        afterComment: true,
        afterDeleteComment: false,
        afterInitialize: false,
        afterEditComment: false,
        onChannelUpdated: false
      });
  }
}
