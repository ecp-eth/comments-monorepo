// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import { Test } from "forge-std/Test.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { Comments } from "../src/libraries/Comments.sol";
import { ICommentManager } from "../src/interfaces/ICommentManager.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { BaseHook } from "../src/hooks/BaseHook.sol";
import { Hooks } from "../src/libraries/Hooks.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { TestUtils, AlwaysReturningDataHook } from "./utils.sol";

error TestHookRejected();

contract CommentsTest is Test, IERC721Receiver {
  event CommentEdited(
    bytes32 indexed commentId,
    address indexed editedByApp,
    address indexed author,
    address app,
    uint256 channelId,
    bytes32 parentId,
    uint80 createdAt,
    uint80 updatedAt,
    string content,
    string metadata,
    string targetUri,
    string commentType,
    string hookData
  );
  event CommentHookDataUpdated(bytes32 indexed commentId, string hookData);

  CommentManager public comments;
  ChannelManager public channelManager;

  AlwaysReturningDataHook public alwaysReturningDataHook;
  RejectEditHook public rejectEditHook;

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

    alwaysReturningDataHook = new AlwaysReturningDataHook();
    rejectEditHook = new RejectEditHook();

    (comments, channelManager) = TestUtils.createContracts(owner);

    // Setup private keys for signing
    vm.deal(author, 100 ether);
    vm.deal(app, 100 ether);
  }

  function test_EditComment_AsAuthor() public {
    // First create a comment
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(comments, author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Now edit the comment
    Comments.EditComment memory editData = TestUtils.generateDummyEditComment(
      comments,
      author,
      app
    );
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
    emit CommentEdited(
      commentId,
      editData.app,
      author,
      app,
      commentData.channelId,
      commentData.parentId,
      uint80(block.timestamp),
      uint80(block.timestamp),
      editData.content,
      editData.metadata,
      commentData.targetUri,
      commentData.commentType,
      ""
    );
    comments.editComment(commentId, editData, editAppSignature);

    // Verify the comment was edited
    Comments.Comment memory editedComment = comments.getComment(commentId);
    assertEq(editedComment.content, editData.content);
    assertEq(editedComment.metadata, editData.metadata);
    assertEq(editedComment.updatedAt, uint80(block.timestamp));
  }

  function test_EditComment_AsAuthor_UpdatedWithHookData() public {
    // Create a channel with the reject hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Test Description",
      "{}",
      address(alwaysReturningDataHook)
    );

    // Create a comment
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(comments, author, app);
    commentData.channelId = channelId;
    bytes32 commentId = comments.getCommentId(commentData);

    // Post the comment
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );
    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Edit the comment
    Comments.EditComment memory editData = TestUtils.generateDummyEditComment(
      comments,
      author,
      app
    );
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
    emit CommentEdited(
      commentId,
      editData.app,
      author,
      app,
      commentData.channelId,
      commentData.parentId,
      uint80(block.timestamp),
      uint80(block.timestamp),
      editData.content,
      editData.metadata,
      commentData.targetUri,
      commentData.commentType,
      "hook data"
    );
    vm.expectEmit(true, true, true, true);
    emit CommentHookDataUpdated(commentId, "hook data edited");
    comments.editComment(commentId, editData, editAppSignature);

    // Verify the comment was edited
    Comments.Comment memory editedComment = comments.getComment(commentId);
    assertEq(editedComment.content, editData.content);
    assertEq(editedComment.metadata, editData.metadata);
    assertEq(editedComment.updatedAt, uint80(block.timestamp));
    assertEq(editedComment.hookData, "hook data edited");
  }

  function test_EditComment_AsAuthor_RejectedByHook() public {
    // Create a channel with the reject hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Test Description",
      "{}",
      address(rejectEditHook)
    );

    // Create a comment
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(comments, author, app);
    commentData.channelId = channelId;
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Try to edit the comment
    Comments.EditComment memory editData = TestUtils.generateDummyEditComment(
      comments,
      author,
      app
    );
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
    comments.editComment(commentId, editData, editAppSignature);
  }

  function test_EditComment_AsAuthor_InvalidAuthor() public {
    // First create a comment
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(comments, author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    Comments.Comment memory originalComment = comments.getComment(commentId);

    // Try to edit from wrong address
    Comments.EditComment memory editData = TestUtils.generateDummyEditComment(
      comments,
      author,
      app
    );
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
    comments.editComment(commentId, editData, editAppSignature);

    // Verify comment did not change
    Comments.Comment memory editedComment = comments.getComment(commentId);
    assertEq(editedComment.content, originalComment.content);
    assertEq(editedComment.metadata, originalComment.metadata);
    assertEq(editedComment.updatedAt, originalComment.updatedAt);
  }

  function test_EditComment() public {
    // First create a comment
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(comments, author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Now edit the comment
    Comments.EditComment memory editData = TestUtils.generateDummyEditComment(
      comments,
      author,
      app
    );
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
    emit CommentEdited(
      commentId,
      editData.app,
      author,
      app,
      commentData.channelId,
      commentData.parentId,
      uint80(block.timestamp),
      uint80(block.timestamp),
      editData.content,
      editData.metadata,
      commentData.targetUri,
      commentData.commentType,
      ""
    );
    comments.editCommentWithSig(
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
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(comments, author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Try to edit with wrong app signature
    Comments.EditComment memory editData = TestUtils.generateDummyEditComment(
      comments,
      author,
      app
    );
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
    comments.editCommentWithSig(
      commentId,
      editData,
      editAuthorSignature,
      wrongAppSignature
    );
  }

  function test_EditComment_InvalidNonce() public {
    // First create a comment
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(comments, author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Try to edit with wrong nonce
    Comments.EditComment memory editData = TestUtils.generateDummyEditComment(
      comments,
      author,
      app
    );
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
    comments.editCommentWithSig(
      commentId,
      editData,
      editAuthorSignature,
      editAppSignature
    );
  }

  function test_EditComment_WithSigs() public {
    // First add approval
    vm.prank(author);
    comments.addApproval(app);

    // Create and post a comment
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(comments, author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Edit comment with app signature only (using approval)
    Comments.EditComment memory editData = TestUtils.generateDummyEditComment(
      comments,
      author,
      app
    );
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
    emit CommentEdited(
      commentId,
      editData.app,
      author,
      app,
      commentData.channelId,
      commentData.parentId,
      uint80(block.timestamp),
      uint80(block.timestamp),
      editData.content,
      editData.metadata,
      commentData.targetUri,
      commentData.commentType,
      ""
    );
    comments.editCommentWithSig(
      commentId,
      editData,
      bytes(""),
      editAppSignature
    );

    // Verify the comment was edited
    Comments.Comment memory editedComment = comments.getComment(commentId);
    assertEq(editedComment.content, editData.content);
    assertEq(editedComment.metadata, editData.metadata);
    assertEq(editedComment.updatedAt, uint80(block.timestamp));
  }

  function test_EditComment_ExpiredDeadline() public {
    // First create a comment
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(comments, author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Try to edit with expired deadline
    Comments.EditComment memory editData = TestUtils.generateDummyEditComment(
      comments,
      author,
      app
    );
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
    comments.editCommentWithSig(
      commentId,
      editData,
      editAuthorSignature,
      editAppSignature
    );
  }

  function test_EditComment_NonExistentComment() public {
    bytes32 nonExistentId = bytes32(uint256(1));
    Comments.EditComment memory editData = TestUtils.generateDummyEditComment(
      comments,
      author,
      app
    );
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
    comments.editCommentWithSig(
      nonExistentId,
      editData,
      editAuthorSignature,
      editAppSignature
    );
  }

  function test_EditComment_InvalidAuthor() public {
    // First create a comment
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(comments, author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Try to edit with invalid author signature
    Comments.EditComment memory editData = TestUtils.generateDummyEditComment(
      comments,
      author,
      app
    );

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
    comments.editCommentWithSig(
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

contract RejectEditHook is BaseHook {
  function getHookPermissions()
    external
    pure
    override
    returns (Hooks.Permissions memory)
  {
    return
      Hooks.Permissions({
        onInitialize: false,
        onCommentAdd: false,
        onCommentDelete: false,
        onCommentEdit: true,
        onChannelUpdate: false
      });
  }

  function onCommentEdit(
    Comments.Comment calldata,
    address,
    bytes32
  ) external payable override returns (string memory) {
    revert TestHookRejected();
  }
}
