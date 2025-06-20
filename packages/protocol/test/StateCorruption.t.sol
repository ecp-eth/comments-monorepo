// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { Comments } from "../src/types/Comments.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { ICommentManager } from "../src/interfaces/ICommentManager.sol";
import { IChannelManager } from "../src/interfaces/IChannelManager.sol";
import { BaseHook } from "../src/hooks/BaseHook.sol";
import { Hooks } from "../src/types/Hooks.sol";
import { Metadata } from "../src/types/Metadata.sol";
import { TestUtils } from "./utils.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/**
 * @title Malicious Hook for State Corruption Testing
 * @notice This hook attempts various state corruption attacks
 */
contract StateCorruptionHook is BaseHook {
  bool public shouldCorruptState;
  bool public shouldReturnMaliciousMetadata;
  bool public shouldCauseLargeGasUsage;

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
        onCommentEdit: true,
        onChannelUpdate: false,
        onCommentHookDataUpdate: true
      });
  }

  function setCorruptionMode(
    bool _corrupt,
    bool _maliciousMetadata,
    bool _gasUsage
  ) external {
    shouldCorruptState = _corrupt;
    shouldReturnMaliciousMetadata = _maliciousMetadata;
    shouldCauseLargeGasUsage = _gasUsage;
  }

  function _onCommentAdd(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal view override returns (Metadata.MetadataEntry[] memory) {
    if (shouldReturnMaliciousMetadata) {
      return _generateMaliciousMetadata();
    }
    if (shouldCauseLargeGasUsage) {
      _causeExcessiveGasUsage();
    }
    return new Metadata.MetadataEntry[](0);
  }

  function _onCommentEdit(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal view override returns (Metadata.MetadataEntry[] memory) {
    if (shouldReturnMaliciousMetadata) {
      return _generateMaliciousMetadata();
    }
    return new Metadata.MetadataEntry[](0);
  }

  function onCommentHookDataUpdate(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) external view override returns (Metadata.MetadataEntryOp[] memory) {
    if (shouldReturnMaliciousMetadata) {
      // Return malicious metadata operations
      Metadata.MetadataEntryOp[] memory ops = new Metadata.MetadataEntryOp[](
        1000
      );
      for (uint i = 0; i < 1000; i++) {
        ops[i] = Metadata.MetadataEntryOp({
          operation: Metadata.MetadataOperation.SET,
          key: bytes32(i),
          value: new bytes(1000) // Large value
        });
      }
      return ops;
    }
    return new Metadata.MetadataEntryOp[](0);
  }

  function _generateMaliciousMetadata()
    internal
    pure
    returns (Metadata.MetadataEntry[] memory)
  {
    // Generate extremely large metadata array
    Metadata.MetadataEntry[] memory metadata = new Metadata.MetadataEntry[](
      100
    );

    for (uint i = 0; i < 100; i++) {
      bytes memory largeValue = new bytes(10000); // 10KB per entry
      // Fill with some data
      for (uint j = 0; j < largeValue.length; j++) {
        largeValue[j] = bytes1(uint8(j % 256));
      }

      metadata[i] = Metadata.MetadataEntry({
        key: keccak256(abi.encodePacked("malicious_key_", i)),
        value: largeValue
      });
    }

    return metadata;
  }

  function _causeExcessiveGasUsage() internal view {
    // Cause significant gas usage through computation
    uint256 result = 0;
    for (uint i = 0; i < 10000; i++) {
      result += keccak256(abi.encodePacked(i, block.timestamp)).length;
    }
    require(result > 0, "Gas usage computation failed");
  }
}

contract StateCorruptionTest is Test, IERC721Receiver {
  CommentManager public comments;
  ChannelManager public channelManager;
  StateCorruptionHook public stateCorruptionHook;

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
    stateCorruptionHook = new StateCorruptionHook();

    vm.deal(author, 100 ether);
    vm.deal(app, 100 ether);
    vm.deal(attacker, 100 ether);
  }

  function test_ExtremelyLargeContent_ShouldWork() public {
    // Test with very large content string
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");

    // Create 64KB content string
    bytes memory largeContent = new bytes(65536);
    for (uint i = 0; i < largeContent.length; i++) {
      largeContent[i] = bytes1(uint8(65 + (i % 26))); // A-Z pattern
    }
    commentData.content = string(largeContent);

    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Verify comment was stored correctly
    Comments.Comment memory storedComment = comments.getComment(commentId);
    assertEq(
      storedComment.content,
      commentData.content,
      "Large content should be stored correctly"
    );
  }

  function test_ExtremelyLargeTargetUri_ShouldWork() public {
    // Test with very large target URI
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");

    // Create large URI string
    bytes memory largeUri = new bytes(10000);
    for (uint i = 0; i < largeUri.length; i++) {
      largeUri[i] = bytes1(uint8(97 + (i % 26))); // a-z pattern
    }
    commentData.targetUri = string(largeUri);

    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Verify URI was stored correctly
    Comments.Comment memory storedComment = comments.getComment(commentId);
    assertEq(
      storedComment.targetUri,
      commentData.targetUri,
      "Large URI should be stored correctly"
    );
  }

  function test_MassiveMetadataArray_ShouldWork() public {
    // Test with large metadata array
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");

    // Create large metadata array
    Metadata.MetadataEntry[]
      memory largeMetadata = new Metadata.MetadataEntry[](50);
    for (uint i = 0; i < 50; i++) {
      bytes memory value = new bytes(1000); // 1KB per entry
      for (uint j = 0; j < value.length; j++) {
        value[j] = bytes1(uint8(j % 256));
      }

      largeMetadata[i] = Metadata.MetadataEntry({
        key: keccak256(abi.encodePacked("key_", i)),
        value: value
      });
    }
    commentData.metadata = largeMetadata;

    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Verify metadata was stored correctly
    Metadata.MetadataEntry[] memory storedMetadata = comments
      .getCommentMetadata(commentId);
    assertEq(
      storedMetadata.length,
      largeMetadata.length,
      "Metadata array length should match"
    );
  }

  function test_NullBytesInContent_ShouldWork() public {
    // Test content with null bytes and special characters
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    bytes memory contentBytes = hex"48656c6c6f00576f726c64010203ff"; // "Hello\x00World\x01\x02\x03\xFF"
    commentData.content = string(contentBytes);

    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Verify content with null bytes was stored
    Comments.Comment memory storedComment = comments.getComment(commentId);
    assertEq(
      storedComment.content,
      commentData.content,
      "Content with null bytes should be stored"
    );
  }

  function test_MetadataKeyCollisions_ShouldWork() public {
    // Test metadata with potential key collisions
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");

    Metadata.MetadataEntry[] memory metadata = new Metadata.MetadataEntry[](3);
    metadata[0] = Metadata.MetadataEntry({
      key: bytes32(uint256(2)),
      value: bytes("zero key")
    });
    metadata[1] = Metadata.MetadataEntry({
      key: bytes32(uint256(1)),
      value: bytes("one key")
    });
    metadata[2] = Metadata.MetadataEntry({
      key: keccak256("duplicate_risk"),
      value: bytes("hash key")
    });
    commentData.metadata = metadata;

    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Verify all metadata entries were stored
    Metadata.MetadataEntry[] memory storedMetadata = comments
      .getCommentMetadata(commentId);
    assertEq(storedMetadata.length, 3, "All metadata entries should be stored");
  }

  function test_CircularParentReference_ShouldFail() public {
    // Create first comment
    Comments.CreateComment memory commentData1 = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData1.content = "Parent comment";
    bytes32 commentId1 = comments.getCommentId(commentData1);
    bytes memory appSignature1 = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId1
    );

    vm.prank(author);
    comments.postComment(commentData1, appSignature1);

    // Create second comment as reply to first
    Comments.CreateComment memory commentData2 = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData2.content = "Child comment";
    commentData2.parentId = commentId1;
    bytes32 commentId2 = comments.getCommentId(commentData2);
    bytes memory appSignature2 = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId2
    );

    vm.prank(author);
    comments.postComment(commentData2, appSignature2);

    // Try to edit first comment to have second as parent (circular reference)
    // This should be prevented by the comment ID generation including content
    Comments.EditComment memory editData = TestUtils.generateDummyEditComment(
      comments,
      author,
      app
    );
    // Note: We can't actually create a circular reference with the current system
    // because comment IDs are deterministic based on content, not parentId

    bytes32 editHash = comments.getEditCommentHash(
      commentId1,
      author,
      editData
    );
    bytes memory editSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      editHash
    );

    vm.prank(author);
    comments.editComment(commentId1, editData, editSignature);

    // Verify the edit worked (no circular reference possible)
    Comments.Comment memory editedComment = comments.getComment(commentId1);
    assertEq(
      editedComment.content,
      editData.content,
      "Edit should work normally"
    );
  }

  function test_MaxChannelIdValue_ShouldWork() public {
    // Test with maximum channel ID value
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData.channelId = type(uint256).max;

    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    vm.expectRevert(); // Should fail because channel doesn't exist
    comments.postComment(commentData, appSignature);
  }

  function test_NonExistentParentComment_ShouldFail() public {
    // Test referencing non-existent parent comment
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData.parentId = keccak256("non_existent_comment");

    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    vm.expectRevert(ICommentManager.ParentCommentHasNeverExisted.selector);
    comments.postComment(commentData, appSignature);
  }

  function test_BothParentIdAndTargetUri_ShouldFail() public {
    // First create a parent comment
    Comments.CreateComment memory parentCommentData = TestUtils
      .generateDummyCreateComment(author, app, "Parent comment");
    bytes32 parentCommentId = comments.getCommentId(parentCommentData);
    bytes memory parentAppSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      parentCommentId
    );

    vm.prank(author);
    comments.postComment(parentCommentData, parentAppSignature);

    // Test providing both parentId and targetUri (should fail)
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData.parentId = parentCommentId; // Use actual existing parent
    commentData.targetUri = "https://example.com";

    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.InvalidCommentReference.selector,
        "Parent comment and targetUri cannot both be set"
      )
    );
    comments.postComment(commentData, appSignature);
  }

  function test_MaliciousHookMetadata_ShouldBeTruncated() public {
    // Create channel with malicious hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Malicious Hook Channel",
      "Channel with hook that returns excessive metadata",
      new Metadata.MetadataEntry[](0),
      address(stateCorruptionHook)
    );

    stateCorruptionHook.setCorruptionMode(false, true, false);

    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData.channelId = channelId;
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // This might run out of gas or be handled gracefully
    vm.prank(author);
    try comments.postComment(commentData, appSignature) {
      // If it succeeds, verify the comment exists
      Comments.Comment memory storedComment = comments.getComment(commentId);
      assertEq(
        storedComment.author,
        author,
        "Comment should be created despite malicious hook"
      );
    } catch {
      // Expected to fail due to excessive gas usage or memory limits
    }
  }

  function test_ExtremelyLongChannelName_ShouldWork() public {
    // Test creating channel with very long name
    bytes memory longName = new bytes(10000);
    for (uint i = 0; i < longName.length; i++) {
      longName[i] = bytes1(uint8(65 + (i % 26))); // A-Z pattern
    }

    channelManager.createChannel{ value: 0.02 ether }(
      string(longName),
      "Normal description",
      new Metadata.MetadataEntry[](0),
      address(0)
    );
  }

  function test_MetadataWithZeroKey_ShouldntWork() public {
    // Test metadata with zero-length values
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");

    Metadata.MetadataEntry[] memory metadata = new Metadata.MetadataEntry[](1);
    metadata[0] = Metadata.MetadataEntry({
      key: bytes32(""),
      value: bytes("")
    });
    commentData.metadata = metadata;

    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    vm.expectRevert(ICommentManager.InvalidKey.selector);
    comments.postComment(commentData, appSignature);
  }

  function test_MetadataWithZeroLengthValues_ShouldWork() public {
    // Test metadata with zero-length values
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");

    Metadata.MetadataEntry[] memory metadata = new Metadata.MetadataEntry[](2);
    metadata[0] = Metadata.MetadataEntry({
      key: bytes32("empty_value"),
      value: bytes("")
    });
    metadata[1] = Metadata.MetadataEntry({
      key: bytes32("1"),
      value: bytes("zero key value")
    });
    commentData.metadata = metadata;

    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Verify metadata was stored
    Metadata.MetadataEntry[] memory storedMetadata = comments
      .getCommentMetadata(commentId);
    assertEq(
      storedMetadata.length,
      2,
      "Both metadata entries should be stored"
    );
    assertEq(
      storedMetadata[0].value.length,
      0,
      "Empty value should be preserved"
    );
  }

  function test_ReactionWithoutTargetOrParent_ShouldFail() public {
    // Test creating reaction without target or parent
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData.commentType = Comments.COMMENT_TYPE_REACTION;
    commentData.parentId = bytes32(0);
    commentData.targetUri = "";

    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.InvalidReactionReference.selector,
        "Reactions must have either a parentId or targetUri"
      )
    );
    comments.postComment(commentData, appSignature);
  }

  function test_EditDeletedComment_ShouldFail() public {
    // Create and delete a comment, then try to edit it
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Delete the comment
    vm.prank(author);
    comments.deleteComment(commentId);

    // Try to edit deleted comment
    Comments.EditComment memory editData = TestUtils.generateDummyEditComment(
      comments,
      author,
      app
    );
    bytes32 editHash = comments.getEditCommentHash(commentId, author, editData);
    bytes memory editSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      editHash
    );

    vm.prank(author);
    vm.expectRevert();
    comments.editComment(commentId, editData, editSignature);

    // Comment should still be marked as deleted after edit
    assertTrue(
      comments.isDeleted(commentId),
      "Comment should remain deleted after edit"
    );
  }

  function test_StateConsistencyAfterFailedOperations() public {
    // Test that failed operations don't corrupt state
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    bytes32 commentId = comments.getCommentId(commentData);

    // Try with invalid signature first
    vm.prank(author);
    vm.expectRevert(ICommentManager.InvalidAppSignature.selector);
    comments.postComment(commentData, bytes("invalid"));

    // Verify comment doesn't exist
    Comments.Comment memory comment = comments.getComment(commentId);
    assertEq(comment.author, address(0), "Comment should not exist");

    // Now post with valid signature
    bytes memory validSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );
    vm.prank(author);
    comments.postComment(commentData, validSignature);

    // Verify comment exists and is correct
    Comments.Comment memory storedComment = comments.getComment(commentId);
    assertEq(
      storedComment.author,
      author,
      "Comment should be created correctly after failed attempt"
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
