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
import { TestUtils, AlwaysReturningDataHook } from "./utils.sol";
import { BaseHook } from "../src/hooks/BaseHook.sol";
import { Hooks } from "../src/libraries/Hooks.sol";

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
        onChannelUpdate: false
      });
  }
}

contract CommentsTest is Test, IERC721Receiver {
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
    Comments.MetadataEntry[] metadata
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

  NoHook public noHook;
  AlwaysReturningDataHook public alwaysReturningDataHook;

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
    alwaysReturningDataHook = new AlwaysReturningDataHook();
    (comments, channelManager) = TestUtils.createContracts(owner);

    // Setup private keys for signing
    vm.deal(author, 100 ether);
    vm.deal(app, 100 ether);
  }

  function test_PostComment_AsAuthor() public {
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
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
    comments.postComment(commentData, appSignature);
  }

  function test_PostComment_AsAuthor_InvalidAuthor() public {
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
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
    vm.expectRevert("Not comment author");
    comments.postComment(commentData, appSignature);
  }

  function test_PostComment_AsAuthor_InvalidAppSignature() public {
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
    commentData.app = app;

    vm.prank(author);
    comments.addApproval(app);

    // Send transaction as author
    vm.prank(author);
    vm.expectRevert(ICommentManager.InvalidAppSignature.selector);
    comments.postComment(commentData, "");
  }

  function test_PostCommentWithSig_ValidSignatures() public {
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
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

    comments.postCommentWithSig(commentData, authorSignature, appSignature);
  }

  function test_PostCommentWithSig_InvalidAppSignature() public {
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
    commentData.app = app;

    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory authorSignature = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      commentId
    );
    bytes memory wrongSignature = TestUtils.signEIP712(vm, 0x3, commentId); // Wrong private key

    vm.expectRevert(ICommentManager.InvalidAppSignature.selector);
    comments.postCommentWithSig(commentData, authorSignature, wrongSignature);
  }

  function test_PostCommentWithSigs_ValidAppSignature_AppApproved() public {
    // First add approval
    vm.prank(author);
    comments.addApproval(app);

    // Create and post comment
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Post comment from any address since we have approval
    comments.postCommentWithSig(commentData, bytes(""), appSignature);
  }

  function test_PostCommentWithSigs_ValidAppSignature_AppNotApproved() public {
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
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
    comments.postCommentWithSig(commentData, bytes(""), appSignature);
  }

  function test_PostCommentWithSigs_ValidAppSignature_AppApproved_PostAsAnotherApp()
    public
  {
    address anotherApp = address(0x999);
    // First add approval
    vm.prank(author);
    comments.addApproval(app);
    comments.addApproval(anotherApp);

    // Create and post comment
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, anotherApp);

    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.expectRevert(
      abi.encodeWithSelector(ICommentManager.InvalidAppSignature.selector)
    );
    comments.postCommentWithSig(commentData, bytes(""), appSignature);
  }

  function test_PostCommentWithSig_WithFeeCollection() public {
    uint256 channelId1 = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Test Description",
      "{}",
      address(noHook)
    );

    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
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
    comments.postCommentWithSig{ value: 0.1 ether }(
      commentData,
      authorSignature,
      appSignature
    );
  }

  function test_PostCommentWithSig_WithInvalidFee() public {
    // Setup fee collector that requires 1 ether
    MaliciousFeeCollector maliciousCollector = new MaliciousFeeCollector();

    uint256 channelId2 = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Test Description",
      "{}",
      address(maliciousCollector)
    );

    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
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
    comments.postCommentWithSig{ value: 0.1 ether }(
      commentData,
      authorSignature,
      appSignature
    );
  }

  function test_PostCommentWithSig_WithThreading() public {
    // Post parent comment
    Comments.CreateComment memory parentComment = TestUtils
      .generateDummyCreateComment(author, app);
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

    comments.postCommentWithSig(parentComment, parentAuthorSig, parentAppSig);

    // Post reply comment
    Comments.CreateComment memory replyComment = TestUtils
      .generateDummyCreateComment(author, app);
    replyComment.parentId = parentId; // Set parent ID for reply

    bytes32 replyId = comments.getCommentId(replyComment);
    bytes memory replyAuthorSig = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      replyId
    );
    bytes memory replyAppSig = TestUtils.signEIP712(vm, appPrivateKey, replyId);

    comments.postCommentWithSig(replyComment, replyAuthorSig, replyAppSig);

    // Verify thread relationship
    Comments.Comment memory storedReply = comments.getComment(replyId);
    assertEq(
      storedReply.parentId,
      parentId,
      "Reply should have correct parent ID"
    );
  }

  function test_PostCommentWithSig_ExpiredDeadline() public {
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
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
    comments.postCommentWithSig(commentData, authorSignature, appSignature);
  }

  function test_PostCommentWithSig_ReplyToDeletedComment() public {
    // Post parent comment
    Comments.CreateComment memory parentComment = TestUtils
      .generateDummyCreateComment(author, app);
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

    comments.postCommentWithSig(parentComment, parentAuthorSig, parentAppSig);

    // Delete the parent comment
    vm.prank(author);
    comments.deleteComment(parentId);

    // Post reply to deleted comment
    Comments.CreateComment memory replyComment = TestUtils
      .generateDummyCreateComment(author, app);
    replyComment.parentId = parentId; // Set parent ID for reply

    bytes32 replyId = comments.getCommentId(replyComment);
    bytes memory replyAuthorSig = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      replyId
    );
    bytes memory replyAppSig = TestUtils.signEIP712(vm, appPrivateKey, replyId);

    // This should succeed even though parent is deleted
    comments.postCommentWithSig(replyComment, replyAuthorSig, replyAppSig);

    // Verify reply was created with correct parent ID
    Comments.Comment memory storedReply = comments.getComment(replyId);
    assertEq(
      storedReply.parentId,
      parentId,
      "Reply should have correct parent ID"
    );
  }

  function test_PostCommentWithSig_CannotHaveBothParentIdAndTargetUri() public {
    // First create a parent comment
    Comments.CreateComment memory parentComment = TestUtils
      .generateDummyCreateComment(author, app);
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
    comments.postCommentWithSig(parentComment, parentAuthorSig, parentAppSig);

    // Create a comment with both parentId and targetUri set
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
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
    comments.postCommentWithSig(commentData, authorSignature, appSignature);
  }

  function test_PostCommentWithSig_WithHookData() public {
    // Create a channel with the hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Test Description",
      "{}",
      address(alwaysReturningDataHook)
    );

    // Create a comment
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

    vm.expectEmit(true, true, true, true);
    emit CommentAdded(
      commentId,
      author,
      app,
      channelId,
      commentData.parentId,
      uint96(block.timestamp),
      commentData.content,
      commentData.targetUri,
      commentData.commentType,
      new Comments.MetadataEntry[](0)
    );
    vm.expectEmit(true, true, true, true);
    emit CommentHookMetadataSet(
      commentId,
      bytes32("string status"),
      bytes("hook data")
    );
    comments.postCommentWithSig(commentData, authorSignature, appSignature);

    // Verify the comment was created with hook metadata
    Comments.MetadataEntry[] memory hookMetadata = comments
      .getCommentHookMetadata(commentId);
    assertEq(hookMetadata.length, 1);
    assertEq(hookMetadata[0].key, bytes32("string status"));
    assertEq(string(hookMetadata[0].value), "hook data");
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
    Comments.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal pure override returns (Comments.MetadataEntry[] memory) {
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
