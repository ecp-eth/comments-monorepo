// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import { Test } from "forge-std/Test.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { Comments } from "../src/libraries/Comments.sol";
import { ICommentManager } from "../src/interfaces/ICommentManager.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { TestUtils } from "./utils.sol";

contract CommentsTest is Test, IERC721Receiver {
  event CommentDeleted(bytes32 indexed commentId, address indexed author);

  CommentManager public comments;
  ChannelManager public channelManager;

  address public owner;
  address public author;
  address public app;
  address public otherApp;
  uint256 public authorPrivateKey = 0x1;
  uint256 public appPrivateKey = 0x2;
  uint256 public wrongPrivateKey = 0x3;
  uint256 public otherAppPrivateKey = 0x4;

  function setUp() public {
    owner = address(this);
    author = vm.addr(authorPrivateKey);
    app = vm.addr(appPrivateKey);
    otherApp = vm.addr(otherAppPrivateKey);

    (comments, channelManager) = TestUtils.createContracts(owner);

    // Setup private keys for signing
    vm.deal(author, 100 ether);
    vm.deal(app, 100 ether);
  }

  function test_DeleteComment_AsAuthor() public {
    // Create and post a comment first
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Delete the comment as author
    vm.prank(author);
    vm.expectEmit(true, true, true, true);
    emit CommentDeleted(commentId, author);
    comments.deleteComment(commentId);

    // Verify comment is deleted
    Comments.Comment memory deletedComment = comments.getComment(commentId);
    assertEq(deletedComment.author, address(0));
  }

  function test_DeleteComment_AsNonAuthor() public {
    // Create and post a comment first
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Delete the comment as non-author
    vm.prank(address(0xdead));
    vm.expectRevert("Not comment author");
    comments.deleteComment(commentId);

    // Verify comment is notdeleted
    assertTrue(comments.getComment(commentId).author != address(0));
  }

  function test_DeleteCommentWithSig_ValidAuthorSig() public {
    // Create and post a comment first
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Delete the comment with signature
    bytes32 deleteHash = comments.getDeleteCommentHash(
      commentId,
      author,
      app,
      block.timestamp + 1 days
    );
    bytes memory authorDeleteSignature = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      deleteHash
    );

    vm.expectEmit(true, true, true, true);
    emit CommentDeleted(commentId, author);
    comments.deleteCommentWithSig(
      commentId,
      app,
      block.timestamp + 1 days,
      authorDeleteSignature,
      ""
    );
  }

  function test_DeleteCommentWithSig_InvalidAuthorSig() public {
    // First create a comment
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Try to delete with wrong signature
    uint256 deadline = block.timestamp + 1 days;
    bytes32 deleteHash = comments.getDeleteCommentHash(
      commentId,
      author,
      app,
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
    comments.deleteCommentWithSig(commentId, app, deadline, wrongSignature, "");

    // Verify comment still exists
    assertTrue(comments.getComment(commentId).author != address(0));
  }

  function test_DeleteCommentWithSig_ValidAppSig_AppApproved() public {
    // Create and post a comment first
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);
    vm.prank(author);
    comments.addApproval(app, block.timestamp + 30 days);

    // Delete the comment with signature
    bytes32 deleteHash = comments.getDeleteCommentHash(
      commentId,
      author,
      app,
      block.timestamp + 1 days
    );
    bytes memory appDeleteSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      deleteHash
    );

    vm.expectEmit(true, true, true, true);
    emit CommentDeleted(commentId, author);
    comments.deleteCommentWithSig(
      commentId,
      app,
      block.timestamp + 1 days,
      "",
      appDeleteSignature
    );
  }

  function test_DeleteCommentWithSig_ValidAppSig_AppNotApproved() public {
    // Create and post a comment first
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Delete the comment with signature
    bytes32 deleteHash = comments.getDeleteCommentHash(
      commentId,
      author,
      app,
      block.timestamp + 1 days
    );
    bytes memory appDeleteSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      deleteHash
    );

    vm.prank(address(0xdead));
    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.NotAuthorized.selector,
        address(0xdead),
        author
      )
    );
    comments.deleteCommentWithSig(
      commentId,
      app,
      block.timestamp + 1 days,
      "",
      appDeleteSignature
    );
  }

  function test_DeleteCommentWithSig_InvalidAppSig_AppApproved() public {
    // Create and post a comment first
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);
    vm.prank(author);
    comments.addApproval(app, block.timestamp + 30 days);

    // Try to delete with wrong signature
    uint256 deadline = block.timestamp + 1 days;
    bytes32 deleteHash = comments.getDeleteCommentHash(
      commentId,
      author,
      app,
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
    comments.deleteCommentWithSig(commentId, app, deadline, "", wrongSignature);

    // Verify comment still exists
    assertTrue(comments.getComment(commentId).author != address(0));
  }

  function test_DeleteComment_SenderIsApp_AppApproved() public {
    // Create and post a comment first
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);
    vm.prank(author);
    comments.addApproval(app, block.timestamp + 30 days);

    // Delete the comment without signature if the sender is the app itself
    vm.prank(app);
    vm.expectEmit(true, true, true, true);
    emit CommentDeleted(commentId, author);
    comments.deleteCommentWithSig(
      commentId,
      app,
      block.timestamp + 1 days,
      "",
      ""
    );
  }

  function test_DeleteComment_SenderIsApp_AppNotApproved() public {
    // Create and post a comment first
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Delete the comment with signature
    bytes32 deleteHash = comments.getDeleteCommentHash(
      commentId,
      author,
      app,
      block.timestamp + 1 days
    );
    bytes memory appDeleteSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      deleteHash
    );

    vm.prank(app);
    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.NotAuthorized.selector,
        address(app),
        author
      )
    );
    comments.deleteCommentWithSig(
      commentId,
      app,
      block.timestamp + 1 days,
      "",
      appDeleteSignature
    );
  }

  function test_DeleteComment_NonExistentComment() public {
    bytes32 nonExistentId = bytes32(uint256(1));

    vm.prank(author);
    vm.expectRevert(ICommentManager.CommentDoesNotExist.selector);
    comments.deleteComment(nonExistentId);
  }

  function test_DeleteComment_NotAuthor() public {
    // First create a comment
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

    // Try to delete as non-author
    address nonAuthor = address(0x4);
    vm.prank(nonAuthor);
    vm.expectRevert("Not comment author");
    comments.deleteComment(commentId);
  }

  function test_DeleteComment_WithApprovedSigner() public {
    // First add approval
    vm.prank(author);
    comments.addApproval(app, block.timestamp + 30 days);

    // Create and post a comment
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Delete the comment with app signature only
    bytes32 deleteHash = comments.getDeleteCommentHash(
      commentId,
      author,
      app,
      block.timestamp + 1 days
    );
    bytes memory appDeleteSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      deleteHash
    );

    vm.expectEmit(true, true, true, true);
    emit CommentDeleted(commentId, author);
    comments.deleteCommentWithSig(
      commentId,
      app,
      block.timestamp + 1 days,
      bytes(""), // Empty author signature
      appDeleteSignature
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
