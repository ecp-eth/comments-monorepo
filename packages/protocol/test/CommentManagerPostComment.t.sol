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
import { Metadata } from "../src/libraries/Metadata.sol";
import { IProtocolFees } from "../src/interfaces/IProtocolFees.sol";

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

  function getRequiredFee() public pure returns (uint256) {
    return REQUIRED_FEE;
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
    uint8 authMethod,
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

  NoHook public noHook;
  AlwaysReturningDataHook public alwaysReturningDataHook;
  FeeRequiringHook public feeRequiringHook;

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
    feeRequiringHook = new FeeRequiringHook();
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
    comments.addApproval(app, block.timestamp + 30 days);

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
    comments.addApproval(app, block.timestamp + 30 days);

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
    comments.addApproval(app, block.timestamp + 30 days);
    comments.addApproval(anotherApp, block.timestamp + 30 days);

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
      new Metadata.MetadataEntry[](0),
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
      new Metadata.MetadataEntry[](0),
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

  function test_PostCommentWithSig_ReplyWithDifferentChannelId() public {
    // Create two different channels
    uint256 channelId1 = channelManager.createChannel{ value: 0.02 ether }(
      "Channel 1",
      "Description 1",
      new Metadata.MetadataEntry[](0),
      address(0)
    );
    uint256 channelId2 = channelManager.createChannel{ value: 0.02 ether }(
      "Channel 2",
      "Description 2",
      new Metadata.MetadataEntry[](0),
      address(0)
    );

    // Post parent comment in channel 1
    Comments.CreateComment memory parentComment = TestUtils
      .generateDummyCreateComment(author, app);
    parentComment.channelId = channelId1;
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

    // Try to post reply in channel 2
    Comments.CreateComment memory replyComment = TestUtils
      .generateDummyCreateComment(author, app);
    replyComment.parentId = parentId;
    replyComment.channelId = channelId2; // Set different channel ID

    bytes32 replyId = comments.getCommentId(replyComment);
    bytes memory replyAuthorSig = TestUtils.signEIP712(
      vm,
      authorPrivateKey,
      replyId
    );
    bytes memory replyAppSig = TestUtils.signEIP712(vm, appPrivateKey, replyId);

    // This should fail because reply is in different channel than parent
    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.ParentCommentNotInSameChannel.selector
      )
    );
    comments.postCommentWithSig(replyComment, replyAuthorSig, replyAppSig);
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
      new Metadata.MetadataEntry[](0),
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
      uint8(Comments.AuthorAuthMethod.AUTHOR_SIGNATURE),
      new Metadata.MetadataEntry[](0)
    );
    vm.expectEmit(true, true, true, true);
    emit CommentHookMetadataSet(
      commentId,
      bytes32("string status"),
      bytes("hook data")
    );
    comments.postCommentWithSig(commentData, authorSignature, appSignature);

    // Verify the comment was created with hook metadata
    Metadata.MetadataEntry[] memory hookMetadata = comments
      .getCommentHookMetadata(commentId);
    assertEq(hookMetadata.length, 1);
    assertEq(hookMetadata[0].key, bytes32("string status"));
    assertEq(string(hookMetadata[0].value), "hook data");
  }

  function test_PostCommentWithSig_WithProtocolAndHookFees() public {
    // Set protocol comment creation fee
    uint96 commentsProtocolFee = 0.01 ether;
    uint96 channelCreationFee = 0.02 ether;
    channelManager.setCommentCreationFee(commentsProtocolFee);

    uint256 hookFee = feeRequiringHook.getRequiredFee();

    // Calculate the total amount needed to send to get hookFee after protocol fee
    uint256 hookProtocolFee = channelManager.calculateMsgValueWithHookFee(
      hookFee
    ) - hookFee;

    // Create channel with fee hook that requires 0.001 ETH
    uint256 channelId = channelManager.createChannel{
      value: channelCreationFee
    }(
      "Test Channel",
      "Test Description",
      new Metadata.MetadataEntry[](0),
      address(feeRequiringHook)
    );

    // Verify channel creation fee was collected
    assertEq(address(channelManager).balance, channelCreationFee);

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

    assertEq(address(feeRequiringHook).balance, 0);

    // Post comment with both protocol fee (0.01 ETH) and hook fee (0.001 ETH)
    vm.prank(author);
    vm.deal(author, 1 ether);
    comments.postCommentWithSig{
      value: commentsProtocolFee + hookFee + hookProtocolFee
    }(commentData, authorSignature, appSignature);

    assertEq(address(feeRequiringHook).balance, hookFee);
    assertEq(
      address(feeRequiringHook).balance,
      feeRequiringHook.getRequiredFee()
    );
    assertEq(address(comments).balance, 0);
    // Verify protocol fee was collected
    assertEq(
      address(channelManager).balance,
      channelCreationFee + commentsProtocolFee + hookProtocolFee
    ); // 0.02 (channel creation) + 0.01 (comment fee) + hook protocol fee
    // Verify hook fee was collected
  }

  function test_PostCommentWithSig_WithProtocolAndHookFees_InsufficientFee()
    public
  {
    // Set protocol comment creation fee
    channelManager.setCommentCreationFee(0.01 ether);

    // Create channel with fee hook that requires 0.001 ETH
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Test Description",
      new Metadata.MetadataEntry[](0),
      address(feeRequiringHook)
    );

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

    // Try to post comment with insufficient fee (only 0.005 ETH when 0.011 ETH is required)
    vm.prank(author);
    vm.deal(author, 1 ether);
    vm.expectRevert();
    comments.postCommentWithSig{ value: 0.005 ether }(
      commentData,
      authorSignature,
      appSignature
    );
  }

  function test_PostCommentWithSig_WithProtocolAndHookFees_ExcessFee() public {
    // Set protocol comment creation fee
    channelManager.setCommentCreationFee(0.01 ether);

    // Create channel with fee hook that requires 0.001 ETH
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Test Description",
      new Metadata.MetadataEntry[](0),
      address(0)
    );

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

    // Post comment with excess fee (0.02 ETH when 0.01 ETH is required)
    vm.prank(author);
    vm.deal(author, 1 ether);
    uint256 authorBalanceBefore = author.balance;

    comments.postCommentWithSig{ value: 0.02 ether }(
      commentData,
      authorSignature,
      appSignature
    );

    // Verify excess fee was refunded
    assertEq(author.balance, authorBalanceBefore - 0.01 ether);
    assertEq(address(channelManager).balance, 0.03 ether); // 0.02 (channel creation) + 0.01 (comment fee)
  }

  function onERC721Received(
    address,
    address,
    uint256,
    bytes calldata
  ) external pure returns (bytes4) {
    return IERC721Receiver.onERC721Received.selector;
  }

  // Tests for AuthorAuthMethod tracking
  function test_PostComment_StoresDirectTxAuthMethod() public {
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

    // Send transaction as author (direct transaction)
    vm.prank(author);
    bytes32 actualCommentId = comments.postComment(commentData, appSignature);

    // Verify the comment was stored with DIRECT_TX auth method (0)
    Comments.Comment memory storedComment = comments.getComment(
      actualCommentId
    );
    assertEq(
      storedComment.authMethod,
      0,
      "Auth method should be DIRECT_TX (0)"
    );
    assertEq(storedComment.author, author, "Author should match");
    assertEq(storedComment.app, app, "App should match");
  }

  function test_PostCommentWithSig_StoresAuthorSignatureAuthMethod() public {
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

    // Post comment with author signature (no pre-approval)
    bytes32 actualCommentId = comments.postCommentWithSig(
      commentData,
      authorSignature,
      appSignature
    );

    // Verify the comment was stored with AUTHOR_SIGNATURE auth method (2)
    Comments.Comment memory storedComment = comments.getComment(
      actualCommentId
    );
    assertEq(
      storedComment.authMethod,
      2,
      "Auth method should be AUTHOR_SIGNATURE (2)"
    );
    assertEq(storedComment.author, author, "Author should match");
    assertEq(storedComment.app, app, "App should match");
  }

  function test_PostCommentWithSig_StoresAppApprovalAuthMethod() public {
    // First add approval for the app
    vm.prank(author);
    comments.addApproval(app, block.timestamp + 30 days);

    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
    commentData.app = app;

    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Post comment with app approval (empty author signature)
    bytes32 actualCommentId = comments.postCommentWithSig(
      commentData,
      bytes(""), // empty author signature
      appSignature
    );

    // Verify the comment was stored with APP_APPROVAL auth method (1)
    Comments.Comment memory storedComment = comments.getComment(
      actualCommentId
    );
    assertEq(
      storedComment.authMethod,
      1,
      "Auth method should be APP_APPROVAL (1)"
    );
    assertEq(storedComment.author, author, "Author should match");
    assertEq(storedComment.app, app, "App should match");
  }

  function test_PostCommentWithSig_ExpiredApproval_Reverts() public {
    // Add approval with expiry in the near future
    uint256 expiry = block.timestamp + 1;
    vm.prank(author);
    comments.addApproval(app, expiry);

    // Advance time past expiry
    vm.warp(expiry + 1);

    // Prepare comment data
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app);
    commentData.app = app;
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Try to post comment with only app signature (should revert due to expired approval)
    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.NotAuthorized.selector,
        address(this),
        author
      )
    );
    comments.postCommentWithSig(commentData, bytes(""), appSignature);
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
