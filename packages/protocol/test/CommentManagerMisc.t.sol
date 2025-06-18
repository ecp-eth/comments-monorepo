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
import { Metadata } from "../src/libraries/Metadata.sol";

contract CommentsTest is Test, IERC721Receiver {
  event ApprovalAdded(
    address indexed approver,
    address indexed approved,
    uint256 expiry
  );
  event ApprovalRemoved(address indexed approver, address indexed approved);
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
  event CommentHookMetadataSet(
    bytes32 indexed commentId,
    bytes32 indexed key,
    bytes value
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
    uint256 expiry = block.timestamp + 30 days;
    vm.prank(author);
    vm.expectEmit(true, true, true, true);
    emit ApprovalAdded(author, app, expiry);
    comments.addApproval(app, expiry);

    assertTrue(comments.isApproved(author, app));
  }

  function test_revokeApproval() public {
    // First add approval
    vm.prank(author);
    comments.addApproval(app, block.timestamp + 30 days);

    // Then remove it
    vm.prank(author);
    vm.expectEmit(true, true, true, true);
    emit ApprovalRemoved(author, app);
    comments.revokeApproval(app);

    assertFalse(comments.isApproved(author, app));
  }

  function test_AddApproval_WithSignature() public {
    uint256 expiry = block.timestamp + 30 days;
    uint256 nonce = 0;
    uint256 deadline = block.timestamp + 1 days;

    bytes32 addApprovalHash = comments.getAddApprovalHash(
      author,
      app,
      expiry,
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
    emit ApprovalAdded(author, app, expiry);
    comments.addApprovalWithSig(
      author,
      app,
      expiry,
      nonce,
      deadline,
      signature
    );

    assertTrue(comments.isApproved(author, app));
  }

  function test_revokeApproval_WithSignature() public {
    // First add approval
    vm.prank(author);
    comments.addApproval(app, block.timestamp + 30 days);

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
    comments.removeApprovalWithSig(author, app, nonce, deadline, signature);

    assertFalse(comments.isApproved(author, app));
  }

  function test_AddApproval_InvalidNonce() public {
    uint256 expiry = block.timestamp + 30 days;
    uint256 wrongNonce = 1;
    uint256 deadline = block.timestamp + 1 days;

    bytes32 addApprovalHash = comments.getAddApprovalHash(
      author,
      app,
      expiry,
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
    comments.addApprovalWithSig(
      author,
      app,
      expiry,
      wrongNonce,
      deadline,
      signature
    );
  }

  function test_revokeApproval_InvalidNonce() public {
    vm.prank(author);
    comments.addApproval(app, block.timestamp + 30 days);

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
    comments.addApproval(app, block.timestamp + 30 days);
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
      uint88(block.timestamp),
      commentData.content,
      commentData.targetUri,
      commentData.commentType,
      uint8(Comments.AuthorAuthMethod.AUTHOR_SIGNATURE),
      new Metadata.MetadataEntry[](0)
    );
    comments.postCommentWithSig(commentData, authorSignature, appSignature);
  }

  function test_UpdateCommentHookData() public {
    // Create a channel with our test hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Channel for testing hook updates",
      new Metadata.MetadataEntry[](0),
      address(0)
    );

    // Create and set the test hook
    TestHookUpdater hook = new TestHookUpdater();
    channelManager.setHook(channelId, address(hook));

    // Create a comment in this channel
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
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

    // Post the comment (this will call onCommentAdd and set initial metadata)
    comments.postCommentWithSig(commentData, authorSignature, appSignature);

    // Verify initial hook metadata was set by onCommentAdd
    bytes32[] memory keys = comments.getCommentHookMetadataKeys(commentId);
    assertEq(keys.length, 2);
    assertEq(
      comments.getCommentHookMetadataValue(commentId, "uint256 initial_score"),
      abi.encode(uint256(100))
    );
    assertEq(
      comments.getCommentHookMetadataValue(commentId, "string status"),
      abi.encode("active")
    );

    // Now test updateCommentHookData
    // Expect events for the operations the hook will perform
    vm.expectEmit(true, true, true, true);
    emit CommentHookMetadataSet(commentId, "string status", ""); // DELETE operation

    vm.expectEmit(true, true, true, true);
    emit CommentHookMetadataSet(
      commentId,
      "uint256 initial_score",
      abi.encode(uint256(150))
    ); // UPDATE operation

    vm.expectEmit(true, true, true, true);
    emit CommentHookMetadataSet(
      commentId,
      "uint96 last_updated",
      abi.encode(block.timestamp)
    ); // NEW operation

    // Call updateCommentHookData
    comments.updateCommentHookData(commentId);

    // Verify the operations were applied correctly
    keys = comments.getCommentHookMetadataKeys(commentId);
    assertEq(keys.length, 2); // One deleted, one updated, one added = 2 total

    // Check that "status" was deleted
    assertEq(
      comments.getCommentHookMetadataValue(commentId, "string status").length,
      0
    );

    // Check that "initial_score" was updated
    assertEq(
      comments.getCommentHookMetadataValue(commentId, "uint256 initial_score"),
      abi.encode(uint256(150))
    );

    // Check that "last_updated" was added
    assertEq(
      comments.getCommentHookMetadataValue(commentId, "uint96 last_updated"),
      abi.encode(block.timestamp)
    );

    // Verify the keys array contains the expected keys
    bool foundScore = false;
    bool foundLastUpdated = false;
    bool foundStatus = false;

    for (uint i = 0; i < keys.length; i++) {
      if (keys[i] == "uint256 initial_score") foundScore = true;
      if (keys[i] == "uint96 last_updated") foundLastUpdated = true;
      if (keys[i] == "string status") foundStatus = true;
    }

    assertTrue(foundScore);
    assertTrue(foundLastUpdated);
    assertFalse(foundStatus); // Should be deleted
  }

  function test_UpdateCommentHookData_NonExistentComment() public {
    bytes32 nonExistentId = keccak256("non-existent");

    vm.expectRevert(ICommentManager.CommentDoesNotExist.selector);
    comments.updateCommentHookData(nonExistentId);
  }

  function test_UpdateCommentHookData_NoHook() public {
    // Create comment without hook
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

    vm.expectRevert(ICommentManager.HookNotEnabled.selector);
    comments.updateCommentHookData(commentId);
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
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal pure override returns (Metadata.MetadataEntry[] memory) {
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
        onInitialize: false,
        onCommentAdd: true,
        onCommentDelete: false,
        onCommentEdit: false,
        onChannelUpdate: false,
        onCommentHookDataUpdate: false
      });
  }
}

// Mock hook that demonstrates SET and DELETE operations for updateCommentHookData
contract TestHookUpdater is BaseHook {
  function _onCommentAdd(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal pure override returns (Metadata.MetadataEntry[] memory) {
    // Set initial metadata when comment is added
    Metadata.MetadataEntry[] memory metadata = new Metadata.MetadataEntry[](2);
    metadata[0] = Metadata.MetadataEntry({
      key: "uint256 initial_score",
      value: abi.encode(uint256(100))
    });
    metadata[1] = Metadata.MetadataEntry({
      key: "string status",
      value: abi.encode("active")
    });
    return metadata;
  }

  function _onCommentHookDataUpdate(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal view override returns (Metadata.MetadataEntryOp[] memory) {
    // Demonstrate SET and DELETE operations
    Metadata.MetadataEntryOp[]
      memory operations = new Metadata.MetadataEntryOp[](3);

    // DELETE operation - remove the status field
    operations[0] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.DELETE,
      key: "string status",
      value: "" // Ignored for DELETE
    });

    // SET operation - update existing score
    operations[1] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: "uint256 initial_score",
      value: abi.encode(uint256(150))
    });

    // SET operation - add new field
    operations[2] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: "uint96 last_updated",
      value: abi.encode(block.timestamp)
    });

    return operations;
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
        onCommentHookDataUpdate: true
      });
  }
}
