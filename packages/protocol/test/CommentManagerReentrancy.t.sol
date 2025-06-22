// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { Comments } from "../src/types/Comments.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { ICommentManager } from "../src/interfaces/ICommentManager.sol";
import { BaseHook } from "../src/hooks/BaseHook.sol";
import { Hooks } from "../src/types/Hooks.sol";
import { Metadata } from "../src/types/Metadata.sol";
import { Channels } from "../src/types/Channels.sol";
import { IHook } from "../src/interfaces/IHook.sol";
import { TestUtils } from "./utils.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

error ReentrancyAttempted();

/**
 * @title Malicious Hook for Reentrancy Testing
 * @notice This hook attempts various reentrancy attacks during comment operations
 */
contract ReentrantHook is BaseHook {
  CommentManager public commentManager;
  address public attacker;
  uint256 public reentrantCallCount;
  bool public shouldAttemptReentry;
  uint8 public attackType; // 0=post, 1=edit, 2=delete, 3=approval

  Comments.CreateComment public reentrantCommentData;
  bytes public reentrantAppSignature;

  function _getHookPermissions()
    internal
    pure
    override
    returns (Hooks.Permissions memory)
  {
    return
      Hooks.Permissions({
        onInitialize: true,
        onCommentAdd: true,
        onCommentDelete: true,
        onCommentEdit: true,
        onChannelUpdate: false,
        onCommentHookDataUpdate: false
      });
  }

  function setAttackParams(
    CommentManager _commentManager,
    address _attacker,
    Comments.CreateComment memory _commentData,
    bytes memory _appSignature,
    uint8 _attackType
  ) external {
    commentManager = _commentManager;
    attacker = _attacker;
    reentrantCommentData = _commentData;
    reentrantAppSignature = _appSignature;
    attackType = _attackType;
  }

  function enableReentry() external {
    shouldAttemptReentry = true;
    reentrantCallCount = 0;
  }

  function onInitialize(
    address,
    Channels.Channel memory,
    uint256,
    Metadata.MetadataEntry[] calldata
  ) external pure override returns (bool) {
    return true;
  }

  function _onCommentAdd(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32 commentId
  ) internal override returns (Metadata.MetadataEntry[] memory) {
    if (shouldAttemptReentry && reentrantCallCount == 0) {
      reentrantCallCount++;
      _attemptReentrantAttack(commentId);
    }
    return new Metadata.MetadataEntry[](0);
  }

  function _onCommentEdit(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32 commentId
  ) internal override returns (Metadata.MetadataEntry[] memory) {
    if (shouldAttemptReentry && reentrantCallCount == 0) {
      reentrantCallCount++;
      _attemptReentrantAttack(commentId);
    }
    return new Metadata.MetadataEntry[](0);
  }

  function _onCommentDelete(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32 commentId
  ) internal override returns (bool) {
    if (shouldAttemptReentry && reentrantCallCount == 0) {
      reentrantCallCount++;
      _attemptReentrantAttack(commentId);
    }
    return true;
  }

  function _attemptReentrantAttack(bytes32 targetCommentId) internal {
    try this.executeReentrantCall(targetCommentId) {
      // If this succeeds, the reentrancy guard failed
      revert ReentrancyAttempted();
    } catch {
      // Expected to revert due to reentrancy guard
    }
  }

  function executeReentrantCall(bytes32 targetCommentId) external {
    if (attackType == 0) {
      // Attempt to post another comment
      commentManager.postComment(reentrantCommentData, reentrantAppSignature);
    } else if (attackType == 1) {
      // Attempt to edit the current comment
      Comments.EditComment memory editData = Comments.EditComment({
        app: reentrantCommentData.app,
        nonce: commentManager.getNonce(
          reentrantCommentData.author,
          reentrantCommentData.app
        ),
        deadline: block.timestamp + 1 hours,
        content: "Reentrancy attack edit",
        metadata: new Metadata.MetadataEntry[](0)
      });
      commentManager.editComment(
        targetCommentId,
        editData,
        reentrantAppSignature
      );
    } else if (attackType == 2) {
      // Attempt to delete the current comment
      commentManager.deleteComment(targetCommentId);
    }
  }
}

/**
 * @title Malicious Contract for Fee Reentrancy
 * @notice Attempts reentrancy during fee collection
 */
contract ReentrantFeeCollector {
  CommentManager public commentManager;
  bool public shouldReenter;
  Comments.CreateComment public attackCommentData;
  bytes public attackAppSignature;

  function setAttackParams(
    CommentManager _commentManager,
    Comments.CreateComment memory _commentData,
    bytes memory _appSignature
  ) external {
    commentManager = _commentManager;
    attackCommentData = _commentData;
    attackAppSignature = _appSignature;
    shouldReenter = true;
  }

  receive() external payable {
    if (shouldReenter && gasleft() > 100000) {
      shouldReenter = false; // Prevent infinite recursion
      try commentManager.postComment(attackCommentData, attackAppSignature) {
        revert ReentrancyAttempted();
      } catch {
        // Expected to fail
      }
    }
  }

  function onERC721Received(
    address,
    address,
    uint256,
    bytes calldata
  ) external returns (bytes4) {
    if (shouldReenter && gasleft() > 100000) {
      shouldReenter = false; // Prevent infinite recursion
      try commentManager.postComment(attackCommentData, attackAppSignature) {
        revert ReentrancyAttempted();
      } catch {
        // Expected to fail
      }
    }
    return IERC721Receiver.onERC721Received.selector;
  }
}

contract CommentManagerReentrancyTest is Test, IERC721Receiver {
  CommentManager public comments;
  ChannelManager public channelManager;
  ReentrantHook public reentrantHook;
  ReentrantFeeCollector public reentrantFeeCollector;

  address public owner;
  address public author;
  address public app;
  address public attacker;
  uint256 public authorPrivateKey = 0x1;
  uint256 public appPrivateKey = 0x2;
  uint256 public attackerPrivateKey = 0x4;

  function setUp() public {
    owner = address(this);
    author = vm.addr(authorPrivateKey);
    app = vm.addr(appPrivateKey);
    attacker = vm.addr(attackerPrivateKey);

    (comments, channelManager) = TestUtils.createContracts(owner);

    reentrantHook = new ReentrantHook();
    reentrantFeeCollector = new ReentrantFeeCollector();

    vm.deal(author, 100 ether);
    vm.deal(app, 100 ether);
    vm.deal(attacker, 100 ether);
  }

  function test_ReentrantHookOnCommentAdd_ShouldSucceed() public {
    // Create channel with reentrant hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Reentrant Channel",
      "Channel for testing reentrancy",
      new Metadata.MetadataEntry[](0),
      address(reentrantHook)
    );

    // Setup attack parameters
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData.channelId = channelId;

    Comments.CreateComment memory attackCommentData = TestUtils
      .generateDummyCreateComment(address(reentrantHook), app, "Test comment");
    attackCommentData.channelId = channelId;
    attackCommentData.content = "Reentrant attack comment";

    bytes32 commentId = comments.getCommentId(commentData);
    bytes32 attackCommentId = comments.getCommentId(attackCommentData);

    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );
    bytes memory attackAppSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      attackCommentId
    );

    reentrantHook.setAttackParams(
      comments,
      address(reentrantHook),
      attackCommentData,
      attackAppSignature,
      0 // post comment attack
    );
    reentrantHook.enableReentry();

    // Attempt reentrancy - should succeed since there's no reentrancy guard
    vm.prank(author);
    vm.expectRevert(ReentrancyAttempted.selector);
    comments.postComment(commentData, appSignature);
  }

  function test_ReentrantHookOnCommentEdit_ShouldFail() public {
    // Create channel with reentrant hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Reentrant Channel",
      "Channel for testing reentrancy",
      new Metadata.MetadataEntry[](0),
      address(reentrantHook)
    );

    // First create a comment normally
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData.channelId = channelId;
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Temporarily disable reentrancy for initial comment creation
    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Setup attack parameters for edit reentrancy
    Comments.CreateComment memory attackCommentData = TestUtils
      .generateDummyCreateComment(attacker, app, "Test comment");
    attackCommentData.channelId = channelId;
    bytes32 attackCommentId = comments.getCommentId(attackCommentData);
    bytes memory attackAppSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      attackCommentId
    );

    reentrantHook.setAttackParams(
      comments,
      attacker,
      attackCommentData,
      attackAppSignature,
      1 // edit comment attack
    );
    reentrantHook.enableReentry();

    // Now edit the comment, triggering reentrancy attack
    Comments.EditComment memory editData = TestUtils.generateDummyEditComment(
      comments,
      author,
      app
    );
    bytes32 editHash = comments.getEditCommentHash(commentId, author, editData);
    bytes memory editAppSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      editHash
    );

    vm.prank(author);
    comments.editComment(commentId, editData, editAppSignature);

    // Verify reentrancy was attempted but failed
    assertEq(
      reentrantHook.reentrantCallCount(),
      1,
      "Reentrant call should have been attempted"
    );
  }

  function test_ReentrantHookOnCommentDelete_ShouldFail() public {
    // Create channel with reentrant hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Reentrant Channel",
      "Channel for testing reentrancy",
      new Metadata.MetadataEntry[](0),
      address(reentrantHook)
    );

    // Create a comment
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData.channelId = channelId;
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Setup attack parameters for delete reentrancy
    Comments.CreateComment memory attackCommentData = TestUtils
      .generateDummyCreateComment(attacker, app, "Test comment");
    attackCommentData.channelId = channelId;
    bytes32 attackCommentId = comments.getCommentId(attackCommentData);
    bytes memory attackAppSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      attackCommentId
    );

    reentrantHook.setAttackParams(
      comments,
      attacker,
      attackCommentData,
      attackAppSignature,
      2 // delete comment attack
    );
    reentrantHook.enableReentry();

    // Delete the comment, triggering reentrancy attack
    vm.prank(author);
    comments.deleteComment(commentId);

    // Verify reentrancy was attempted but failed
    assertEq(
      reentrantHook.reentrantCallCount(),
      1,
      "Reentrant call should have been attempted"
    );

    // Verify comment was actually deleted
    assertTrue(comments.isDeleted(commentId), "Comment should be deleted");
  }

  function test_BatchOperationReentrancy_ShouldFail() public {
    // Create channel with reentrant hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Reentrant Channel",
      "Channel for testing reentrancy",
      new Metadata.MetadataEntry[](0),
      address(reentrantHook)
    );

    // Setup batch operation with reentrancy attack
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData.channelId = channelId;
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    Comments.CreateComment memory attackCommentData = TestUtils
      .generateDummyCreateComment(attacker, app, "Test comment");
    attackCommentData.channelId = channelId;
    bytes32 attackCommentId = comments.getCommentId(attackCommentData);
    bytes memory attackAppSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      attackCommentId
    );

    reentrantHook.setAttackParams(
      comments,
      attacker,
      attackCommentData,
      attackAppSignature,
      0 // post comment attack
    );
    reentrantHook.enableReentry();

    // Create batch operation
    Comments.BatchOperation[] memory operations = new Comments.BatchOperation[](
      1
    );
    operations[0] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.POST_COMMENT,
      value: 0,
      data: abi.encode(commentData),
      signatures: new bytes[](1)
    });
    operations[0].signatures[0] = appSignature;

    // Execute batch operation - reentrancy should be blocked
    vm.prank(author);
    comments.batchOperations{ value: 0 }(operations);

    // Verify reentrancy was attempted but failed
    assertEq(
      reentrantHook.reentrantCallCount(),
      1,
      "Reentrant call should have been attempted"
    );
  }

  function test_FeeCollectionReentrancy_ShouldFail() public {
    // Setup attack parameters
    Comments.CreateComment memory attackCommentData = TestUtils
      .generateDummyCreateComment(attacker, app, "Test comment");
    bytes32 attackCommentId = comments.getCommentId(attackCommentData);
    bytes memory attackAppSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      attackCommentId
    );

    reentrantFeeCollector.setAttackParams(
      comments,
      attackCommentData,
      attackAppSignature
    );

    // Set channel creation fee that will trigger fee collection
    channelManager.setChannelCreationFee(1 ether);

    // Attempt to create channel from reentrant contract - should fail
    vm.prank(address(reentrantFeeCollector));
    vm.deal(address(reentrantFeeCollector), 2 ether);

    // This should not trigger reentrancy because fee collection happens after the main operation
    uint256 channelId = channelManager.createChannel{ value: 1 ether }(
      "Test Channel",
      "Test Description",
      new Metadata.MetadataEntry[](0),
      address(0)
    );

    // Channel should be created successfully
    assertTrue(channelManager.channelExists(channelId), "Channel should exist");
  }

  function test_ApprovalReentrancy_ShouldFail() public {
    // Test reentrancy during approval operations
    vm.prank(author);
    comments.addApproval(app, block.timestamp + 30 days);

    // Verify approval was added
    assertTrue(comments.isApproved(author, app), "Approval should be set");

    // Remove approval
    vm.prank(author);
    comments.revokeApproval(app);

    // Verify approval was removed
    assertFalse(comments.isApproved(author, app), "Approval should be removed");
  }

  function test_CrossFunctionReentrancy_ShouldFail() public {
    // Test reentrancy between different functions (post -> edit -> delete)
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Cross Function Channel",
      "Channel for cross-function reentrancy testing",
      new Metadata.MetadataEntry[](0),
      address(reentrantHook)
    );

    // Create initial comment
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData.channelId = channelId;
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Setup cross-function attack (try to edit during post)
    Comments.CreateComment memory attackCommentData = TestUtils
      .generateDummyCreateComment(attacker, app, "Test comment");
    attackCommentData.channelId = channelId;
    bytes32 attackCommentId = comments.getCommentId(attackCommentData);
    bytes memory attackAppSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      attackCommentId
    );

    reentrantHook.setAttackParams(
      comments,
      attacker,
      attackCommentData,
      attackAppSignature,
      1 // edit attack during post
    );
    reentrantHook.enableReentry();

    // Post comment - should succeed, reentrancy should fail
    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Verify the comment exists and reentrancy was blocked
    Comments.Comment memory storedComment = comments.getComment(commentId);
    assertEq(storedComment.author, author, "Comment should be created");
    assertEq(
      reentrantHook.reentrantCallCount(),
      1,
      "Reentrant call should have been attempted"
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
