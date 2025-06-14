// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import { Test } from "forge-std/Test.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { Comments } from "../src/libraries/Comments.sol";
import { ICommentManager } from "../src/interfaces/ICommentManager.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { BaseHook } from "../src/hooks/BaseHook.sol";
import { Hooks } from "../src/libraries/Hooks.sol";
import { Metadata } from "../src/libraries/Metadata.sol";
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
    uint96 createdAt,
    uint96 updatedAt,
    string content,
    string targetUri,
    uint8 commentType,
    Metadata.MetadataEntry[] metadata
  );
  event CommentMetadataSet(
    bytes32 indexed commentId,
    bytes32 indexed key,
    bytes value
  );
  event CommentHookMetadataSet(
    bytes32 indexed commentId,
    bytes32 indexed key,
    bytes value
  );

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
      .generateDummyCreateComment(author, app);
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
    expectedCommentData.updatedAt = uint88(block.timestamp);

    vm.prank(author);
    vm.expectEmit(true, true, true, true);
    emit CommentEdited(
      commentId,
      editData.app,
      author,
      app,
      commentData.channelId,
      commentData.parentId,
      uint96(block.timestamp),
      uint96(block.timestamp),
      editData.content,
      commentData.targetUri,
      commentData.commentType,
      editData.metadata
    );
    comments.editComment(commentId, editData, editAppSignature);

    // Verify the comment was edited
    Comments.Comment memory editedComment = comments.getComment(commentId);
    assertEq(editedComment.content, editData.content);
    assertEq(editedComment.updatedAt, uint96(block.timestamp));
  }

  function test_EditComment_AsAuthorAndApp_AppSignatureNotRequired() public {
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

    // Now edit the comment
    Comments.EditComment memory editData = TestUtils.generateDummyEditComment(
      comments,
      author,
      // set app to author address so we can avoid app signature
      author
    );

    // Add metadata to the edit
    Metadata.MetadataEntry[] memory metadata = new Metadata.MetadataEntry[](1);
    metadata[0] = Metadata.MetadataEntry({
      key: bytes32("string key"),
      value: bytes("test value")
    });
    editData.metadata = metadata;

    Comments.Comment memory expectedCommentData = comments.getComment(
      commentId
    );

    expectedCommentData.content = editData.content;
    expectedCommentData.updatedAt = uint88(block.timestamp);

    vm.prank(author);
    vm.expectEmit(true, true, true, true);
    emit CommentMetadataSet(
      commentId,
      bytes32("string key"),
      bytes("test value")
    );
    emit CommentEdited(
      commentId,
      editData.app,
      author,
      app,
      commentData.channelId,
      commentData.parentId,
      uint96(block.timestamp),
      uint88(block.timestamp),
      editData.content,
      commentData.targetUri,
      commentData.commentType,
      editData.metadata
    );
    comments.editComment(commentId, editData, "");

    // Verify the comment was edited
    Comments.Comment memory editedComment = comments.getComment(commentId);
    assertEq(editedComment.content, editData.content);
    assertEq(editedComment.updatedAt, uint96(block.timestamp));

    // Verify metadata was set
    Metadata.MetadataEntry[] memory commentMetadata = comments
      .getCommentMetadata(commentId);
    assertEq(commentMetadata.length, 1);
    assertEq(commentMetadata[0].key, bytes32("string key"));
    assertEq(string(commentMetadata[0].value), "test value");
  }

  function test_EditComment_AsAuthor_UpdatedWithHookData() public {
    // Create a channel with the reject hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Test Description",
      new Metadata.MetadataEntry[](0),
      address(alwaysReturningDataHook)
    );

    // Create a comment
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
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

    vm.prank(author);
    vm.expectEmit(true, true, true, true);
    emit CommentEdited(
      commentId,
      editData.app,
      author,
      app,
      commentData.channelId,
      commentData.parentId,
      uint96(block.timestamp),
      uint96(block.timestamp),
      editData.content,
      commentData.targetUri,
      commentData.commentType,
      editData.metadata
    );
    vm.expectEmit(true, true, true, true);
    emit CommentHookMetadataSet(
      commentId,
      bytes32("string status"),
      bytes("hook data edited")
    );
    comments.editComment(commentId, editData, editAppSignature);

    // Verify the comment was edited
    Comments.Comment memory editedComment = comments.getComment(commentId);
    assertEq(editedComment.content, editData.content);
    assertEq(editedComment.updatedAt, uint96(block.timestamp));

    // Verify hook metadata was set
    Metadata.MetadataEntry[] memory hookMetadata = comments
      .getCommentHookMetadata(commentId);
    assertEq(hookMetadata.length, 1);
    assertEq(hookMetadata[0].key, bytes32("string status"));
    assertEq(string(hookMetadata[0].value), "hook data edited");
  }

  function test_EditComment_AsAuthor_RejectedByHook() public {
    // Create a channel with the reject hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Test Description",
      new Metadata.MetadataEntry[](0),
      address(rejectEditHook)
    );

    // Create a comment
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
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
      .generateDummyCreateComment(author, app);
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
    vm.expectRevert("Not comment author");
    comments.editComment(commentId, editData, editAppSignature);

    // Verify comment did not change
    Comments.Comment memory editedComment = comments.getComment(commentId);
    assertEq(editedComment.content, originalComment.content);
    assertEq(editedComment.updatedAt, originalComment.updatedAt);
  }

  function test_EditCommentWithSig_AuthorSignature() public {
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

    vm.expectEmit(true, true, true, true);
    emit CommentEdited(
      commentId,
      editData.app,
      author,
      app,
      commentData.channelId,
      commentData.parentId,
      uint96(block.timestamp),
      uint96(block.timestamp),
      editData.content,
      commentData.targetUri,
      commentData.commentType,
      editData.metadata
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
    assertEq(editedComment.updatedAt, uint96(block.timestamp));
  }

  function test_EditCommentWithSig_AppSignature_AppApproved() public {
    // First add approval
    vm.prank(author);
    comments.addApproval(app);

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

    vm.expectEmit(true, true, true, true);
    emit CommentEdited(
      commentId,
      editData.app,
      author,
      app,
      commentData.channelId,
      commentData.parentId,
      uint96(block.timestamp),
      uint96(block.timestamp),
      editData.content,
      commentData.targetUri,
      commentData.commentType,
      editData.metadata
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
    assertEq(editedComment.updatedAt, uint96(block.timestamp));
  }

  function test_EditCommentWithSig_SenderIsApp_NoAppSignature() public {
    // First add approval
    vm.prank(author);
    comments.addApproval(app);

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

    // Edit comment without app signature, but broadcaster is the app
    Comments.EditComment memory editData = TestUtils.generateDummyEditComment(
      comments,
      author,
      app
    );

    vm.expectEmit(true, true, true, true);
    emit CommentEdited(
      commentId,
      editData.app,
      author,
      app,
      commentData.channelId,
      commentData.parentId,
      uint96(block.timestamp),
      uint96(block.timestamp),
      editData.content,
      commentData.targetUri,
      commentData.commentType,
      editData.metadata
    );
    vm.prank(app);
    comments.editCommentWithSig(commentId, editData, "", "");

    // Verify the comment was edited
    Comments.Comment memory editedComment = comments.getComment(commentId);
    assertEq(editedComment.content, editData.content);
    assertEq(editedComment.updatedAt, uint96(block.timestamp));
  }

  function test_EditCommentWithSig_InvalidAppSignature() public {
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

  function test_EditCommentWithSig_InvalidNonce() public {
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

  function test_EditCommentWithSig_ExpiredDeadline() public {
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

    vm.expectRevert(ICommentManager.CommentDoesNotExist.selector);
    comments.editCommentWithSig(
      nonExistentId,
      editData,
      editAuthorSignature,
      editAppSignature
    );
  }

  function test_EditCommentWithSig_InvalidAuthor() public {
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
        onChannelUpdate: false,
        onCommentHookDataUpdate: false
      });
  }

  function _onCommentEdit(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal pure override returns (Metadata.MetadataEntry[] memory) {
    revert TestHookRejected();
  }
}
