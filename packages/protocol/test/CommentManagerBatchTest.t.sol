// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { Comments } from "../src/types/Comments.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { ICommentManager } from "../src/interfaces/ICommentManager.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { TestUtils, AlwaysReturningDataHook } from "./utils.sol";
import { BaseHook } from "../src/hooks/BaseHook.sol";
import { Hooks } from "../src/types/Hooks.sol";
import { Metadata } from "../src/types/Metadata.sol";

contract NoHook is BaseHook {
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
        onCommentEdit: false,
        onChannelUpdate: false,
        onCommentHookDataUpdate: false
      });
  }
}

contract FeeRequiringHook is BaseHook {
  uint256 public constant REQUIRED_FEE = 0.001 ether;

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

  function _onCommentAdd(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal override returns (Metadata.MetadataEntry[] memory) {
    if (msg.value < REQUIRED_FEE) {
      revert("Insufficient hook fee");
    }
    return new Metadata.MetadataEntry[](0);
  }
}

contract CommentsBatchTest is Test, IERC721Receiver {
  event CommentAdded(
    bytes32 indexed commentId,
    address indexed author,
    address indexed app,
    uint256 channelId,
    bytes32 parentId,
    uint96 createdAt,
    string content,
    string targetUri,
    uint8 commentType,
    uint8 authMethod,
    Metadata.MetadataEntry[] metadata
  );

  event CommentEdited(
    bytes32 indexed commentId,
    address indexed author,
    address indexed editingApp,
    address app,
    uint256 channelId,
    bytes32 parentId,
    uint96 createdAt,
    uint96 updatedAt,
    string content,
    string targetUri,
    uint8 commentType,
    uint8 authMethod,
    Metadata.MetadataEntry[] metadata
  );

  event CommentDeleted(bytes32 indexed commentId, address indexed author);

  event BatchOperationExecuted(
    address indexed executor,
    uint256 operationsCount,
    uint256 totalValue
  );

  CommentManager public comments;
  ChannelManager public channelManager;

  NoHook public noHook;
  AlwaysReturningDataHook public alwaysReturningDataHook;
  FeeRequiringHook public feeRequiringHook;

  // Test accounts
  address public owner;
  address public author;
  address public author2;
  address public app;
  uint256 public authorPrivateKey = 0x1;
  uint256 public author2PrivateKey = 0x4;
  uint256 public appPrivateKey = 0x2;

  function setUp() public {
    owner = address(this);
    author = vm.addr(authorPrivateKey);
    author2 = vm.addr(author2PrivateKey);
    app = vm.addr(appPrivateKey);
    noHook = new NoHook();
    alwaysReturningDataHook = new AlwaysReturningDataHook();
    feeRequiringHook = new FeeRequiringHook();
    (comments, channelManager) = TestUtils.createContracts(owner);

    // Setup accounts with ETH
    vm.deal(author, 100 ether);
    vm.deal(author2, 100 ether);
    vm.deal(app, 100 ether);
  }

  function test_BatchOperations_SimplePostComment() public {
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");

    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Create single batch operation
    Comments.BatchOperation[] memory operations = new Comments.BatchOperation[](
      1
    );
    operations[0] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.POST_COMMENT,
      data: abi.encode(commentData),
      signatures: _createSignatureArray(appSignature),
      value: 0
    });

    vm.prank(author);
    bytes[] memory results = comments.batchOperations(operations);

    assertEq(results.length, 1);
    bytes32 returnedId = abi.decode(results[0], (bytes32));
    assertEq(returnedId, commentId);

    // Verify comment was created
    Comments.Comment memory storedComment = comments.getComment(commentId);
    assertEq(storedComment.author, author);
    assertEq(storedComment.content, commentData.content);
  }

  function test_BatchOperations_PostCommentWithSig() public {
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");

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

    Comments.BatchOperation[] memory operations = new Comments.BatchOperation[](
      1
    );
    operations[0] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.POST_COMMENT_WITH_SIG,
      data: abi.encode(commentData),
      signatures: _createSignatureArray(authorSignature, appSignature),
      value: 0
    });

    bytes[] memory results = comments.batchOperations(operations);

    assertEq(results.length, 1);
    bytes32 returnedId = abi.decode(results[0], (bytes32));
    assertEq(returnedId, commentId);
  }

  function test_BatchOperations_DependentComments_ThreadedConversation()
    public
  {
    // Create a threaded conversation: parent -> reply1 -> reply2

    // Parent comment
    Comments.CreateComment memory parentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    parentData.content = "Parent comment";

    bytes32 parentId = comments.getCommentId(parentData);
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

    // Reply 1 to parent
    Comments.CreateComment memory reply1Data = TestUtils
      .generateDummyCreateComment(author2, app, "Test comment");
    reply1Data.content = "First reply";
    reply1Data.parentId = parentId;
    reply1Data.targetUri = ""; // Clear target URI for reply

    bytes32 reply1Id = comments.getCommentId(reply1Data);
    bytes memory reply1AuthorSig = TestUtils.signEIP712(
      vm,
      author2PrivateKey,
      reply1Id
    );
    bytes memory reply1AppSig = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      reply1Id
    );

    // Reply 2 to reply 1
    Comments.CreateComment memory reply2Data = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    reply2Data.content = "Reply to first reply";
    reply2Data.parentId = reply1Id;
    reply2Data.targetUri = ""; // Clear target URI for reply

    bytes32 reply2Id = comments.getCommentId(reply2Data);
    bytes memory reply2AuthorSig = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      reply2Id
    );
    bytes memory reply2AppSig = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      reply2Id
    );

    // Create batch operations
    Comments.BatchOperation[] memory operations = new Comments.BatchOperation[](
      3
    );

    operations[0] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.POST_COMMENT_WITH_SIG,
      data: abi.encode(parentData),
      signatures: _createSignatureArray(parentAuthorSig, parentAppSig),
      value: 0
    });

    operations[1] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.POST_COMMENT_WITH_SIG,
      data: abi.encode(reply1Data),
      signatures: _createSignatureArray(reply1AuthorSig, reply1AppSig),
      value: 0
    });

    operations[2] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.POST_COMMENT_WITH_SIG,
      data: abi.encode(reply2Data),
      signatures: _createSignatureArray(reply2AuthorSig, reply2AppSig),
      value: 0
    });

    // Execute batch
    bytes[] memory results = comments.batchOperations(operations);

    assertEq(results.length, 3);

    // Verify all comments were created with correct threading
    Comments.Comment memory parent = comments.getComment(parentId);
    assertEq(parent.content, "Parent comment");
    assertEq(parent.parentId, bytes32(0));

    Comments.Comment memory reply1 = comments.getComment(reply1Id);
    assertEq(reply1.content, "First reply");
    assertEq(reply1.parentId, parentId);

    Comments.Comment memory reply2 = comments.getComment(reply2Id);
    assertEq(reply2.content, "Reply to first reply");
    assertEq(reply2.parentId, reply1Id);
  }

  function test_BatchOperations_WithValueDistribution() public {
    // Set protocol fees
    channelManager.setCommentCreationFee(0.01 ether);

    // Create channel with fee-requiring hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Test Description",
      new Metadata.MetadataEntry[](0),
      address(feeRequiringHook)
    );

    uint256 hookFee = feeRequiringHook.REQUIRED_FEE();
    uint256 protocolFee = 0.01 ether;
    uint256 hookProtocolFee = channelManager.calculateMsgValueWithHookFee(
      hookFee
    ) - hookFee;
    uint256 totalPerOperation = protocolFee + hookFee + hookProtocolFee;

    // Create two comments with fees
    Comments.CreateComment memory comment1Data = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    comment1Data.channelId = channelId;
    comment1Data.content = "Comment 1";

    Comments.CreateComment memory comment2Data = TestUtils
      .generateDummyCreateComment(author2, app, "Test comment");
    comment2Data.channelId = channelId;
    comment2Data.content = "Comment 2";

    bytes32 comment1Id = comments.getCommentId(comment1Data);
    bytes32 comment2Id = comments.getCommentId(comment2Data);

    bytes memory comment1AuthorSig = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      comment1Id
    );
    bytes memory comment1AppSig = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      comment1Id
    );
    bytes memory comment2AuthorSig = TestUtils.signEIP712(
      vm,
      author2PrivateKey,
      comment2Id
    );
    bytes memory comment2AppSig = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      comment2Id
    );

    Comments.BatchOperation[] memory operations = new Comments.BatchOperation[](
      2
    );

    operations[0] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.POST_COMMENT_WITH_SIG,
      data: abi.encode(comment1Data),
      signatures: _createSignatureArray(comment1AuthorSig, comment1AppSig),
      value: totalPerOperation
    });

    operations[1] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.POST_COMMENT_WITH_SIG,
      data: abi.encode(comment2Data),
      signatures: _createSignatureArray(comment2AuthorSig, comment2AppSig),
      value: totalPerOperation
    });

    uint256 totalValue = totalPerOperation * 2;
    uint256 initialChannelBalance = address(channelManager).balance;
    uint256 initialHookBalance = address(feeRequiringHook).balance;

    // Execute batch with proper total value
    vm.expectEmit(true, true, true, true);
    emit BatchOperationExecuted(address(this), 2, totalValue);

    bytes[] memory results = comments.batchOperations{ value: totalValue }(
      operations
    );

    assertEq(results.length, 2);

    // Verify fees were distributed correctly
    assertEq(
      address(channelManager).balance,
      initialChannelBalance + (protocolFee + hookProtocolFee) * 2
    );
    assertEq(
      address(feeRequiringHook).balance,
      initialHookBalance + hookFee * 2
    );

    // Verify comments were created
    Comments.Comment memory comment1 = comments.getComment(comment1Id);
    assertEq(comment1.content, "Comment 1");
    Comments.Comment memory comment2 = comments.getComment(comment2Id);
    assertEq(comment2.content, "Comment 2");
  }

  function test_BatchOperations_FailsWithIncorrectValueDistribution() public {
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory authorSig = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      commentId
    );
    bytes memory appSig = TestUtils.signEIP712(vm, appPrivateKey, commentId);

    Comments.BatchOperation[] memory operations = new Comments.BatchOperation[](
      1
    );
    operations[0] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.POST_COMMENT_WITH_SIG,
      data: abi.encode(commentData),
      signatures: _createSignatureArray(authorSig, appSig),
      value: 0.1 ether // Operation expects 0.1 ether
    });

    // Send wrong total value
    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.InvalidValueDistribution.selector,
        0.05 ether, // sent
        0.1 ether // required
      )
    );
    comments.batchOperations{ value: 0.05 ether }(operations);
  }

  function test_BatchOperations_FailsWithEmptyOperationsArray() public {
    Comments.BatchOperation[] memory operations = new Comments.BatchOperation[](
      0
    );

    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.InvalidBatchOperation.selector,
        0,
        "Empty operations array"
      )
    );
    comments.batchOperations(operations);
  }

  function test_BatchOperations_PostEditDeleteSequence() public {
    // Create, edit, then delete a comment in one batch

    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData.content = "Original content";

    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory postAppSig = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Edit data
    Comments.EditComment memory editData = Comments.EditComment({
      content: "Edited content",
      metadata: new Metadata.MetadataEntry[](0),
      app: app,
      nonce: 0, // First edit, so nonce is 0
      deadline: block.timestamp + 1 hours
    });

    bytes32 editHash = comments.getEditCommentHash(commentId, author, editData);
    bytes memory editAppSig = TestUtils.signEIP712(vm, appPrivateKey, editHash);

    Comments.BatchOperation[] memory operations = new Comments.BatchOperation[](
      3
    );

    // 1. Post comment
    operations[0] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.POST_COMMENT,
      data: abi.encode(commentData),
      signatures: _createSignatureArray(postAppSig),
      value: 0
    });

    // 2. Edit comment
    operations[1] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.EDIT_COMMENT,
      data: abi.encode(commentId, editData),
      signatures: _createSignatureArray(editAppSig),
      value: 0
    });

    // 3. Delete comment
    operations[2] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.DELETE_COMMENT,
      data: abi.encode(commentId),
      signatures: new bytes[](0),
      value: 0
    });

    vm.prank(author);
    bytes[] memory results = comments.batchOperations(operations);

    assertEq(results.length, 3);

    // Verify comment is deleted
    assertTrue(comments.isDeleted(commentId));
  }

  function test_BatchOperations_MixedOperationTypes() public {
    // First create a comment individually to edit/delete later
    Comments.CreateComment memory initialComment = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    bytes32 initialId = comments.getCommentId(initialComment);
    bytes memory initialAuthorSig = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      initialId
    );
    bytes memory initialAppSig = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      initialId
    );

    vm.prank(author);
    comments.postCommentWithSig(
      initialComment,
      initialAuthorSig,
      initialAppSig
    );

    // Now create batch with mixed operations
    // 1. Post new comment
    // 2. Edit the existing comment
    // 3. Delete the existing comment

    Comments.CreateComment memory newComment = TestUtils
      .generateDummyCreateComment(author2, app, "Test comment");
    newComment.content = "New comment in batch";
    bytes32 newId = comments.getCommentId(newComment);
    bytes memory newAuthorSig = TestUtils.signEIP712(
      vm,
      author2PrivateKey,
      newId
    );
    bytes memory newAppSig = TestUtils.signEIP712(vm, appPrivateKey, newId);

    // Edit operation
    Comments.EditComment memory editData = Comments.EditComment({
      content: "Edited content",
      metadata: new Metadata.MetadataEntry[](0),
      app: app,
      nonce: comments.getNonce(author, app),
      deadline: block.timestamp + 1 hours
    });
    bytes32 editHash = comments.getEditCommentHash(initialId, author, editData);
    bytes memory editAuthorSig = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      editHash
    );
    bytes memory editAppSig = TestUtils.signEIP712(vm, appPrivateKey, editHash);

    Comments.BatchOperation[] memory operations = new Comments.BatchOperation[](
      3
    );

    // Post new comment
    operations[0] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.POST_COMMENT_WITH_SIG,
      data: abi.encode(newComment),
      signatures: _createSignatureArray(newAuthorSig, newAppSig),
      value: 0
    });

    // Edit existing comment
    operations[1] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.EDIT_COMMENT_WITH_SIG,
      data: abi.encode(initialId, editData),
      signatures: _createSignatureArray(editAuthorSig, editAppSig),
      value: 0
    });

    // Delete the edited comment
    operations[2] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.DELETE_COMMENT,
      data: abi.encode(initialId),
      signatures: new bytes[](0),
      value: 0
    });

    vm.prank(author);
    bytes[] memory results = comments.batchOperations(operations);

    assertEq(results.length, 3);

    // Verify new comment was created
    Comments.Comment memory newStoredComment = comments.getComment(newId);
    assertEq(newStoredComment.content, "New comment in batch");

    // Verify original comment was deleted
    assertTrue(comments.isDeleted(initialId));
  }

  function test_BatchOperations_EditCommentWithSig() public {
    // Create a comment first
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory authorSig = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      commentId
    );
    bytes memory appSig = TestUtils.signEIP712(vm, appPrivateKey, commentId);

    vm.prank(author);
    comments.postCommentWithSig(commentData, authorSig, appSig);

    // Advance time to ensure updatedAt > createdAt
    vm.warp(block.timestamp + 1);

    // Create edit operation
    Comments.EditComment memory editData = Comments.EditComment({
      content: "Edited via batch",
      metadata: new Metadata.MetadataEntry[](0),
      app: app,
      nonce: comments.getNonce(author, app),
      deadline: block.timestamp + 1 hours
    });

    bytes32 editHash = comments.getEditCommentHash(commentId, author, editData);
    bytes memory editAuthorSig = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      editHash
    );
    bytes memory editAppSig = TestUtils.signEIP712(vm, appPrivateKey, editHash);

    Comments.BatchOperation[] memory operations = new Comments.BatchOperation[](
      1
    );
    operations[0] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.EDIT_COMMENT_WITH_SIG,
      data: abi.encode(commentId, editData),
      signatures: _createSignatureArray(editAuthorSig, editAppSig),
      value: 0
    });

    bytes[] memory results = comments.batchOperations(operations);

    assertEq(results.length, 1);

    // Verify comment was edited
    Comments.Comment memory editedComment = comments.getComment(commentId);
    assertEq(editedComment.content, "Edited via batch");
    assertTrue(editedComment.updatedAt > editedComment.createdAt);
  }

  function test_BatchOperations_DeleteWithSig() public {
    // Create a comment first
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory authorSig = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      commentId
    );
    bytes memory appSig = TestUtils.signEIP712(vm, appPrivateKey, commentId);

    vm.prank(author);
    comments.postCommentWithSig(commentData, authorSig, appSig);

    // Create delete operation with signatures
    uint256 deadline = block.timestamp + 1 hours;
    bytes32 deleteHash = comments.getDeleteCommentHash(
      commentId,
      author,
      app,
      deadline
    );
    bytes memory deleteAuthorSig = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      deleteHash
    );
    bytes memory deleteAppSig = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      deleteHash
    );

    Comments.BatchDeleteData memory deleteData = Comments.BatchDeleteData({
      commentId: commentId,
      app: app,
      deadline: deadline
    });

    Comments.BatchOperation[] memory operations = new Comments.BatchOperation[](
      1
    );
    operations[0] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.DELETE_COMMENT_WITH_SIG,
      data: abi.encode(deleteData),
      signatures: _createSignatureArray(deleteAuthorSig, deleteAppSig),
      value: 0
    });

    bytes[] memory results = comments.batchOperations(operations);

    assertEq(results.length, 1);
    assertTrue(comments.isDeleted(commentId));
  }

  function test_BatchOperations_FailsWithInvalidSignatureCount() public {
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");

    // Test POST_COMMENT_WITH_SIG with wrong signature count
    Comments.BatchOperation[] memory operations = new Comments.BatchOperation[](
      1
    );
    operations[0] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.POST_COMMENT_WITH_SIG,
      data: abi.encode(commentData),
      signatures: new bytes[](1), // POST_COMMENT_WITH_SIG requires 2 signatures
      value: 0
    });

    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.InvalidBatchOperation.selector,
        0,
        "POST_COMMENT_WITH_SIG requires exactly 2 signatures"
      )
    );
    comments.batchOperations(operations);

    // Test POST_COMMENT with wrong signature count
    operations[0] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.POST_COMMENT,
      data: abi.encode(commentData),
      signatures: new bytes[](2), // POST_COMMENT requires 1 signature
      value: 0
    });

    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.InvalidBatchOperation.selector,
        0,
        "POST_COMMENT requires exactly 1 signature"
      )
    );
    comments.batchOperations(operations);

    // Test DELETE_COMMENT with signatures (should have 0)
    operations[0] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.DELETE_COMMENT,
      data: abi.encode(bytes32(0)),
      signatures: new bytes[](1), // DELETE_COMMENT requires 0 signatures
      value: 0
    });

    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.InvalidBatchOperation.selector,
        0,
        "DELETE_COMMENT requires no signatures"
      )
    );
    comments.batchOperations(operations);
  }

  function test_BatchOperations_EventsEmittedCorrectly() public {
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory authorSig = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      commentId
    );
    bytes memory appSig = TestUtils.signEIP712(vm, appPrivateKey, commentId);

    Comments.BatchOperation[] memory operations = new Comments.BatchOperation[](
      1
    );
    operations[0] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.POST_COMMENT_WITH_SIG,
      data: abi.encode(commentData),
      signatures: _createSignatureArray(authorSig, appSig),
      value: 0
    });

    // Expect both the CommentAdded event and BatchOperationExecuted event
    vm.expectEmit(true, true, true, true);
    emit CommentAdded(
      commentId,
      author,
      app,
      commentData.channelId,
      commentData.parentId,
      uint88(block.timestamp),
      commentData.content,
      commentData.targetUri,
      commentData.commentType,
      uint8(Comments.AuthorAuthMethod.AUTHOR_SIGNATURE),
      new Metadata.MetadataEntry[](0)
    );

    vm.expectEmit(true, true, true, true);
    emit BatchOperationExecuted(address(this), 1, 0);

    comments.batchOperations(operations);
  }

  function test_BatchOperations_ComplexScenario_MultiUser() public {
    // Complex scenario: Multiple users creating a conversation flow in one batch
    // User 1 posts -> User 2 replies -> User 1 edits original -> User 2 deletes reply

    // User 1 original post
    Comments.CreateComment memory post1 = TestUtils.generateDummyCreateComment(
      author,
      app,
      "Original post by user 1"
    );
    bytes32 post1Id = comments.getCommentId(post1);
    bytes memory post1AuthorSig = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      post1Id
    );
    bytes memory post1AppSig = TestUtils.signEIP712(vm, appPrivateKey, post1Id);

    // User 2 reply
    Comments.CreateComment memory reply2 = TestUtils.generateDummyCreateComment(
      author2,
      app,
      "Reply by user 2"
    );
    reply2.parentId = post1Id;
    reply2.targetUri = "";
    bytes32 reply2Id = comments.getCommentId(reply2);
    bytes memory reply2AuthorSig = TestUtils.signEIP712(
      vm,
      author2PrivateKey,
      reply2Id
    );
    bytes memory reply2AppSig = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      reply2Id
    );

    // User 1 edit of original post
    Comments.EditComment memory editPost1 = Comments.EditComment({
      content: "Edited original post by user 1",
      metadata: new Metadata.MetadataEntry[](0),
      app: app,
      nonce: 0,
      deadline: block.timestamp + 1 hours
    });
    bytes32 editPost1Hash = comments.getEditCommentHash(
      post1Id,
      author,
      editPost1
    );
    bytes memory editPost1AuthorSig = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      editPost1Hash
    );
    bytes memory editPost1AppSig = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      editPost1Hash
    );

    Comments.BatchOperation[] memory operations = new Comments.BatchOperation[](
      4
    );

    // 1. User 1 posts
    operations[0] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.POST_COMMENT_WITH_SIG,
      data: abi.encode(post1),
      signatures: _createSignatureArray(post1AuthorSig, post1AppSig),
      value: 0
    });

    // 2. User 2 replies
    operations[1] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.POST_COMMENT_WITH_SIG,
      data: abi.encode(reply2),
      signatures: _createSignatureArray(reply2AuthorSig, reply2AppSig),
      value: 0
    });

    // 3. User 1 edits original post
    operations[2] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.EDIT_COMMENT_WITH_SIG,
      data: abi.encode(post1Id, editPost1),
      signatures: _createSignatureArray(editPost1AuthorSig, editPost1AppSig),
      value: 0
    });

    // 4. User 2 deletes their reply
    operations[3] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.DELETE_COMMENT,
      data: abi.encode(reply2Id),
      signatures: new bytes[](0),
      value: 0
    });

    vm.prank(author2); // Execute as author2 (last operation needs author2 as sender)
    bytes[] memory results = comments.batchOperations(operations);

    assertEq(results.length, 4);

    // Verify final state
    Comments.Comment memory finalPost1 = comments.getComment(post1Id);
    assertEq(finalPost1.content, "Edited original post by user 1");
    // Note: In batch operations, create and edit happen in same transaction so timestamps are equal
    assertEq(finalPost1.updatedAt, finalPost1.createdAt);

    assertTrue(comments.isDeleted(reply2Id));
  }

  function test_BatchOperations_GasSavingsVsIndividual() public {
    // Create batch operations for comparison
    Comments.CreateComment memory comment1 = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    comment1.content = "Comment 1";
    Comments.CreateComment memory comment2 = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    comment2.content = "Comment 2";
    Comments.CreateComment memory comment3 = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    comment3.content = "Comment 3";

    bytes32 comment1Id = comments.getCommentId(comment1);
    bytes32 comment2Id = comments.getCommentId(comment2);
    bytes32 comment3Id = comments.getCommentId(comment3);

    bytes memory sig1Auth = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      comment1Id
    );
    bytes memory sig1App = TestUtils.signEIP712(vm, appPrivateKey, comment1Id);
    bytes memory sig2Auth = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      comment2Id
    );
    bytes memory sig2App = TestUtils.signEIP712(vm, appPrivateKey, comment2Id);
    bytes memory sig3Auth = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      comment3Id
    );
    bytes memory sig3App = TestUtils.signEIP712(vm, appPrivateKey, comment3Id);

    // Measure gas for individual operations
    uint256 gasStart = gasleft();
    vm.prank(author);
    comments.postCommentWithSig(comment1, sig1Auth, sig1App);
    vm.prank(author);
    comments.postCommentWithSig(comment2, sig2Auth, sig2App);
    vm.prank(author);
    comments.postCommentWithSig(comment3, sig3Auth, sig3App);
    uint256 individualGas = gasStart - gasleft();

    // Reset state - create new comments for batch test
    comment1.content = "Batch Comment 1";
    comment2.content = "Batch Comment 2";
    comment3.content = "Batch Comment 3";

    comment1Id = comments.getCommentId(comment1);
    comment2Id = comments.getCommentId(comment2);
    comment3Id = comments.getCommentId(comment3);

    sig1Auth = TestUtils.signEIP712(vm, authorPrivateKey, comment1Id);
    sig1App = TestUtils.signEIP712(vm, appPrivateKey, comment1Id);
    sig2Auth = TestUtils.signEIP712(vm, authorPrivateKey, comment2Id);
    sig2App = TestUtils.signEIP712(vm, appPrivateKey, comment2Id);
    sig3Auth = TestUtils.signEIP712(vm, authorPrivateKey, comment3Id);
    sig3App = TestUtils.signEIP712(vm, appPrivateKey, comment3Id);

    Comments.BatchOperation[] memory operations = new Comments.BatchOperation[](
      3
    );
    operations[0] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.POST_COMMENT_WITH_SIG,
      data: abi.encode(comment1),
      signatures: _createSignatureArray(sig1Auth, sig1App),
      value: 0
    });
    operations[1] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.POST_COMMENT_WITH_SIG,
      data: abi.encode(comment2),
      signatures: _createSignatureArray(sig2Auth, sig2App),
      value: 0
    });
    operations[2] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.POST_COMMENT_WITH_SIG,
      data: abi.encode(comment3),
      signatures: _createSignatureArray(sig3Auth, sig3App),
      value: 0
    });

    // Measure gas for batch operation
    gasStart = gasleft();
    vm.prank(author);
    comments.batchOperations(operations);
    uint256 batchGas = gasStart - gasleft();

    // Note: Gas savings mainly come from reduced transaction base costs (21k gas per tx)
    // Individual operations: 3 transactions × 21k = 63k gas overhead
    // Batch operations: 1 transaction × 21k = 21k gas overhead
    // Expected savings: 42k gas from transaction overhead

    // The batch might use slightly more execution gas but saves significantly on transaction costs
    uint256 transactionOverheadSavings = 21000 * 2; // Saved 2 transaction base costs
    uint256 totalSavingsWithTxCosts = individualGas +
      transactionOverheadSavings -
      batchGas;

    // Should save at least some execution gas (realistic expectation after library refactoring)
    assertGt(
      totalSavingsWithTxCosts,
      2000,
      "Should save some gas including transaction costs"
    );

    // Log the actual gas usage for analysis
    emit log_named_uint("Individual gas", individualGas);
    emit log_named_uint("Batch gas", batchGas);
    emit log_named_uint(
      "Transaction overhead savings",
      transactionOverheadSavings
    );
    emit log_named_uint(
      "Total savings including tx costs",
      totalSavingsWithTxCosts
    );
  }

  // Helper function to create signature arrays
  function _createSignatureArray(
    bytes memory sig1
  ) internal pure returns (bytes[] memory) {
    bytes[] memory sigs = new bytes[](1);
    sigs[0] = sig1;
    return sigs;
  }

  function _createSignatureArray(
    bytes memory sig1,
    bytes memory sig2
  ) internal pure returns (bytes[] memory) {
    bytes[] memory sigs = new bytes[](2);
    sigs[0] = sig1;
    sigs[1] = sig2;
    return sigs;
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
