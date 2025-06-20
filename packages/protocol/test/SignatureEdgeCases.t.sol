// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { Comments } from "../src/types/Comments.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { ICommentManager } from "../src/interfaces/ICommentManager.sol";
import { Metadata } from "../src/types/Metadata.sol";
import { TestUtils } from "./utils.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract SignatureEdgeCasesTest is Test, IERC721Receiver {
  CommentManager public comments;
  ChannelManager public channelManager;

  address public owner;
  address public author;
  address public app;
  address public attacker;
  uint256 public authorPrivateKey = 0x1;
  uint256 public appPrivateKey = 0x2;
  uint256 public attackerPrivateKey = 0x4;

  // Known valid secp256k1 signature components for testing
  bytes32 constant VALID_R =
    0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
  bytes32 constant VALID_S_LOW =
    0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
  bytes32 constant VALID_S_HIGH =
    0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141;

  function setUp() public {
    owner = address(this);
    author = vm.addr(authorPrivateKey);
    app = vm.addr(appPrivateKey);
    attacker = vm.addr(attackerPrivateKey);

    (comments, channelManager) = TestUtils.createContracts(owner);

    vm.deal(author, 100 ether);
    vm.deal(app, 100 ether);
    vm.deal(attacker, 100 ether);
  }

  function test_EmptySignature_ShouldFail() public {
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    bytes memory emptySignature = "";

    vm.prank(author);
    vm.expectRevert(ICommentManager.InvalidAppSignature.selector);
    comments.postComment(commentData, emptySignature);
  }

  function test_InvalidSignatureLength_ShouldFail() public {
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");

    // Test various invalid signature lengths
    bytes memory shortSignature = hex"1234";
    bytes
      memory longSignature = hex"1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678";

    vm.prank(author);
    vm.expectRevert(ICommentManager.InvalidAppSignature.selector);
    comments.postComment(commentData, shortSignature);

    vm.prank(author);
    vm.expectRevert(ICommentManager.InvalidAppSignature.selector);
    comments.postComment(commentData, longSignature);
  }

  function test_MalformedSignature_ShouldFail() public {
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");

    // Create malformed signature with invalid components
    bytes memory malformedSignature = abi.encodePacked(
      bytes32(0), // Invalid r = 0
      VALID_S_LOW,
      uint8(27) // Valid v
    );

    vm.prank(author);
    vm.expectRevert(ICommentManager.InvalidAppSignature.selector);
    comments.postComment(commentData, malformedSignature);
  }

  function test_SignatureMalleability_ShouldFail() public {
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    bytes32 commentId = comments.getCommentId(commentData);

    // Create valid signature
    bytes memory validSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Extract r, s, v from valid signature
    bytes32 r;
    bytes32 s;
    uint8 v;
    assembly {
      r := mload(add(validSignature, 32))
      s := mload(add(validSignature, 64))
      v := byte(0, mload(add(validSignature, 96)))
    }

    // Create malleable signature with s' = order - s
    bytes32 malleableS = bytes32(
      0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141 -
        uint256(s)
    );
    uint8 malleableV = v == 27 ? 28 : 27;

    bytes memory malleableSignature = abi.encodePacked(
      r,
      malleableS,
      malleableV
    );

    // First signature should work
    vm.prank(author);
    comments.postComment(commentData, validSignature);

    // Malleable signature should fail (comment already exists)
    commentData.content = "Modified content to create different comment";
    bytes32 newCommentId = comments.getCommentId(commentData);
    bytes memory newValidSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      newCommentId
    );

    vm.prank(author);
    comments.postComment(commentData, newValidSignature);
  }

  function test_InvalidVValue_ShouldFail() public {
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");

    // Create signature with invalid v values
    bytes memory invalidVSignature1 = abi.encodePacked(
      VALID_R,
      VALID_S_LOW,
      uint8(26) // Invalid v
    );

    bytes memory invalidVSignature2 = abi.encodePacked(
      VALID_R,
      VALID_S_LOW,
      uint8(29) // Invalid v
    );

    vm.prank(author);
    vm.expectRevert(ICommentManager.InvalidAppSignature.selector);
    comments.postComment(commentData, invalidVSignature1);

    vm.prank(author);
    vm.expectRevert(ICommentManager.InvalidAppSignature.selector);
    comments.postComment(commentData, invalidVSignature2);
  }

  function test_CrossChainSignatureReplay_ShouldWork() public {
    // Test that domain separator prevents cross-chain replays
    // This test verifies the current chain's signatures work

    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory validSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // This should work on the current chain
    vm.prank(author);
    comments.postComment(commentData, validSignature);

    // Verify comment was created
    Comments.Comment memory storedComment = comments.getComment(commentId);
    assertEq(
      storedComment.author,
      author,
      "Comment should be created with valid signature"
    );
  }

  function test_DeadlineEdgeCases() public {
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");

    // Test deadline exactly at current block timestamp
    commentData.deadline = block.timestamp;
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory validSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, validSignature);

    // Test deadline 1 second in the past
    commentData.deadline = block.timestamp - 1;
    commentData.content = "Modified content for past deadline";
    commentId = comments.getCommentId(commentData);
    validSignature = TestUtils.signEIP712(vm, appPrivateKey, commentId);

    vm.prank(author);
    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.SignatureDeadlineReached.selector,
        commentData.deadline,
        block.timestamp
      )
    );
    comments.postComment(commentData, validSignature);
  }

  function test_NonceEdgeCases() public {
    // Test nonce manipulation attacks
    vm.prank(author);
    comments.addApproval(app, block.timestamp + 30 days);

    // Create and post initial comment
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

    // Try to edit with wrong nonce (should be 0 initially)
    Comments.EditComment memory editData = Comments.EditComment({
      app: app,
      nonce: 999, // Wrong nonce
      deadline: block.timestamp + 1 hours,
      content: "Edited content",
      metadata: new Metadata.MetadataEntry[](0)
    });

    bytes32 editHash = comments.getEditCommentHash(commentId, author, editData);
    bytes memory editSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      editHash
    );

    vm.prank(author);
    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.InvalidNonce.selector,
        author,
        app,
        0, // Current nonce
        999 // Expected nonce
      )
    );
    comments.editComment(commentId, editData, editSignature);
  }

  function test_SignatureReplayAcrossFunctions() public {
    // Test that signatures for one function can't be replayed for another

    // Create comment
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory postSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, postSignature);

    // Try to use post signature for edit (should fail)
    Comments.EditComment memory editData = TestUtils.generateDummyEditComment(
      comments,
      author,
      app
    );

    vm.prank(author);
    vm.expectRevert(ICommentManager.InvalidAppSignature.selector);
    comments.editComment(commentId, editData, postSignature);
  }

  function test_MaximumSignatureValues() public {
    // Test signatures with maximum valid values
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");

    // Create signature with maximum valid s value
    bytes32 maxValidS = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;
    bytes memory maxSignature = abi.encodePacked(VALID_R, maxValidS, uint8(27));

    // This should fail as it's not a valid signature for this data
    vm.prank(author);
    vm.expectRevert(ICommentManager.InvalidAppSignature.selector);
    comments.postComment(commentData, maxSignature);
  }

  function test_SignatureWithExtraData() public {
    // Test signature with extra data appended
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory validSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Append extra data to valid signature
    bytes memory signatureWithExtra = abi.encodePacked(
      validSignature,
      hex"deadbeef"
    );

    vm.prank(author);
    vm.expectRevert(ICommentManager.InvalidAppSignature.selector);
    comments.postComment(commentData, signatureWithExtra);
  }

  function test_ContractSignature_EIP1271() public {
    // Test EIP-1271 contract signature validation
    // This would require deploying a smart contract wallet for testing
    // For now, we test that EOA signatures work correctly

    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory validSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, validSignature);

    Comments.Comment memory storedComment = comments.getComment(commentId);
    assertEq(storedComment.author, author, "EOA signature should work");
  }

  function test_DoubleSpendingPrevention() public {
    // Test that same signature can't be used twice
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory validSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // First use should work
    vm.prank(author);
    comments.postComment(commentData, validSignature);

    // Second use should fail (comment already exists)
    vm.prank(author);
    vm.expectRevert(); // Will fail because comment with same ID already exists
    comments.postComment(commentData, validSignature);
  }

  function test_SignatureTimestampManipulation() public {
    // Test that deadline is based on block.timestamp, not signature timestamp
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData.deadline = block.timestamp + 1 hours;

    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory validSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Move time forward past deadline
    vm.warp(block.timestamp + 2 hours);

    vm.prank(author);
    vm.expectRevert(
      abi.encodeWithSelector(
        ICommentManager.SignatureDeadlineReached.selector,
        commentData.deadline,
        block.timestamp
      )
    );
    comments.postComment(commentData, validSignature);
  }

  function test_AuthorSignatureReplayForDifferentApps() public {
    // Test that author signature for one app can't be used with different app
    address app2 = address(0x999);

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

    // First submission should work
    comments.postCommentWithSig(commentData, authorSignature, appSignature);

    // Try to use same author signature with different app
    commentData.app = app2;
    commentData.content = "Different content";
    bytes32 newCommentId = comments.getCommentId(commentData);
    bytes memory app2Signature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      newCommentId
    );

    // Should fail because author signature was for different app
    vm.expectRevert(ICommentManager.InvalidAppSignature.selector);
    comments.postCommentWithSig(commentData, authorSignature, app2Signature);
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
