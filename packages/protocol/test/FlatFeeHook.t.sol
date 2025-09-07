// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { IChannelManager } from "../src/interfaces/IChannelManager.sol";
import { IProtocolFees } from "../src/interfaces/IProtocolFees.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { TestUtils } from "./utils.sol";
import { Hooks } from "../src/types/Hooks.sol";
import { Comments } from "../src/types/Comments.sol";
import { Metadata } from "../src/types/Metadata.sol";
import { FeeEstimatable } from "../src/types/FeeEstimatable.sol";
import { BaseHook } from "../src/hooks/BaseHook.sol";

// Fee charging hook contract
contract FlatFeeHook is BaseHook {
  uint256 public constant HOOK_FEE = 900000000000000; // 0.0009 ether (after 10% protocol fee)

  address public feeCollector;
  uint256 public totalFeesCollected;

  event FeeCollected(address indexed author, uint256 amount);
  event FeeWithdrawn(address indexed collector, uint256 amount);
  event RefundIssued(address indexed author, uint256 amount);

  constructor(address _feeCollector) {
    feeCollector = _feeCollector;
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

  function _onCommentAdd(
    Comments.Comment calldata commentData,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal override returns (Metadata.MetadataEntry[] memory) {
    require(msg.value >= HOOK_FEE, "Insufficient fee");

    totalFeesCollected += HOOK_FEE;
    emit FeeCollected(commentData.author, HOOK_FEE);

    // Store any excess payment for refund in onCommentAdd
    if (msg.value > HOOK_FEE) {
      // Process any pending refunds
      uint256 refundAmount = msg.value - HOOK_FEE;
      if (refundAmount > 0) {
        payable(commentData.author).transfer(refundAmount);
        emit RefundIssued(commentData.author, refundAmount);
      }
    }
    return new Metadata.MetadataEntry[](0);
  }

  function estimateAddCommentFee(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address
  ) external pure returns (FeeEstimatable.FeeEstimation memory feeEstimation) {
    feeEstimation.amount = HOOK_FEE;
    feeEstimation.asset = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    feeEstimation.description = "Flat fee";
    feeEstimation.metadata = new Metadata.MetadataEntry[](0);

    return feeEstimation;
  }

  function estimateEditCommentFee(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address
  ) external pure returns (FeeEstimatable.FeeEstimation memory feeEstimation) {
    feeEstimation.amount = 0;
    feeEstimation.asset = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    feeEstimation.description = "Flat fee";
    feeEstimation.metadata = new Metadata.MetadataEntry[](0);

    return feeEstimation;
  }

  function withdrawFees() external {
    require(msg.sender == feeCollector, "Only fee collector");
    require(totalFeesCollected > 0, "No fees to withdraw");

    uint256 amount = totalFeesCollected;
    totalFeesCollected = 0;

    payable(feeCollector).transfer(amount);
    emit FeeWithdrawn(feeCollector, amount);
  }
}

contract FlatFeeHookTest is Test, IERC721Receiver {
  using TestUtils for string;

  ChannelManager public channelManager;
  FlatFeeHook public feeHook;
  CommentManager public comments;
  address public commentsContract;

  address public owner;
  address public user1;
  address public user2;
  address public feeCollector;

  uint256 user1PrivateKey;
  uint256 user2PrivateKey;

  // Protocol fee is 10% by default
  uint16 constant PROTOCOL_FEE_PERCENTAGE = 1000; // 10%
  uint96 constant HOOK_REGISTRATION_FEE = 0.02 ether;
  uint96 constant CHANNEL_CREATION_FEE = 0.02 ether;
  uint256 constant HOOK_FEE = 900000000000000; // 0.0009 ether (after 10% protocol fee)
  uint256 constant TOTAL_FEE_WITH_PROTOCOL = 0.001 ether; // Total fee including protocol fee

  event FeeCollected(address indexed author, uint256 amount);
  event FeeWithdrawn(address indexed collector, uint256 amount);

  function setUp() public {
    owner = address(this);
    (user1, user1PrivateKey) = makeAddrAndKey("user1");
    (user2, user2PrivateKey) = makeAddrAndKey("user2");
    feeCollector = makeAddr("feeCollector");

    // Deploy fee hook
    feeHook = new FlatFeeHook(feeCollector);

    (comments, channelManager) = TestUtils.createContracts(owner);

    // Set protocol fees
    channelManager.setChannelCreationFee(CHANNEL_CREATION_FEE);
    channelManager.setHookTransactionFee(PROTOCOL_FEE_PERCENTAGE);

    vm.deal(user1, 100 ether);
    vm.deal(user2, 100 ether);
  }

  function _signAppSignature(
    Comments.CreateComment memory commentData
  ) internal view returns (bytes memory) {
    bytes32 digest = comments.getCommentId(commentData);
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(user2PrivateKey, digest);
    return abi.encodePacked(r, s, v);
  }

  function test_FlatFeeHookCollectsExactFee() public {
    // Create channel with fee hook
    uint256 channelId = channelManager.createChannel{
      value: CHANNEL_CREATION_FEE
    }(
      "Fee Channel",
      "Pay 0.001 ETH to comment",
      new Metadata.MetadataEntry[](0),
      address(feeHook)
    );

    Comments.CreateComment memory commentData = Comments.CreateComment({
      content: "Test comment",
      metadata: new Metadata.MetadataEntry[](0),
      targetUri: "",
      commentType: 0, // COMMENT_TYPE_COMMENT
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    bytes memory appSignature = _signAppSignature(commentData);

    uint256 hookBalanceBefore = address(feeHook).balance;
    uint256 user1BalanceBefore = user1.balance;

    // Post comment as user1 with exact fee plus protocol fee
    vm.prank(user1);
    comments.postComment{ value: TOTAL_FEE_WITH_PROTOCOL }(
      commentData,
      appSignature
    );

    // Check that the hook received the hook fee (after protocol fee)
    assertEq(address(feeHook).balance - hookBalanceBefore, HOOK_FEE);
    // Check that user1 paid the total fee (including protocol fee)
    assertEq(user1BalanceBefore - user1.balance, TOTAL_FEE_WITH_PROTOCOL);
    // Check that the hook recorded the fee
    assertEq(feeHook.totalFeesCollected(), HOOK_FEE);
  }

  function test_FlatFeeHookRefundsExcessPaymentExceptProtocolFee() public {
    // Create channel with fee hook
    uint256 channelId = channelManager.createChannel{
      value: CHANNEL_CREATION_FEE
    }(
      "Fee Channel",
      "Pay 0.001 ETH to comment",
      new Metadata.MetadataEntry[](0),
      address(feeHook)
    );

    // Create comment data using direct construction
    Comments.CreateComment memory commentData = Comments.CreateComment({
      content: "Test comment",
      metadata: new Metadata.MetadataEntry[](0),
      targetUri: "",
      commentType: 0, // COMMENT_TYPE_COMMENT
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    bytes memory appSignature = _signAppSignature(commentData);

    uint256 hookBalanceBefore = address(feeHook).balance;
    uint256 user1BalanceBefore = user1.balance;

    // Post comment as user1 with excess fee
    uint256 excessAmount = 0.001 ether;
    uint256 totalSent = TOTAL_FEE_WITH_PROTOCOL + excessAmount;
    vm.prank(user1);
    comments.postComment{ value: totalSent }(commentData, appSignature);

    // Check that the hook received the hook fee (after protocol fee)
    assertEq(address(feeHook).balance - hookBalanceBefore, HOOK_FEE);
    // Check that user1 paid the required fee (including protocol fee)
    assertEq(
      user1BalanceBefore - user1.balance,
      TOTAL_FEE_WITH_PROTOCOL +
        ((excessAmount * PROTOCOL_FEE_PERCENTAGE) / 10000)
    );
    // Check that the hook recorded the fee
    assertEq(feeHook.totalFeesCollected(), HOOK_FEE);
  }

  function test_FlatFeeHookRejectsInsufficientFee() public {
    // Create channel with fee hook
    uint256 channelId = channelManager.createChannel{
      value: CHANNEL_CREATION_FEE
    }(
      "Fee Channel",
      "Pay 0.001 ETH to comment",
      new Metadata.MetadataEntry[](0),
      address(feeHook)
    );

    // Create comment data using direct construction
    Comments.CreateComment memory commentData = Comments.CreateComment({
      content: "Test comment",
      metadata: new Metadata.MetadataEntry[](0),
      targetUri: "",
      commentType: 0, // COMMENT_TYPE_COMMENT
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    bytes memory appSignature = _signAppSignature(commentData);

    // Try to post comment with insufficient fee
    vm.prank(user1);
    vm.expectRevert("Insufficient fee");
    comments.postComment{ value: 0.0005 ether }(commentData, appSignature);
  }

  function test_FlatFeeHookFeeWithdrawal() public {
    // Create channel with fee hook
    uint256 channelId = channelManager.createChannel{
      value: CHANNEL_CREATION_FEE
    }(
      "Fee Channel",
      "Pay 0.001 ETH to comment",
      new Metadata.MetadataEntry[](0),
      address(feeHook)
    );

    // Create comment data using direct construction
    Comments.CreateComment memory commentData = Comments.CreateComment({
      content: "Test comment",
      metadata: new Metadata.MetadataEntry[](0),
      targetUri: "",
      commentType: 0, // COMMENT_TYPE_COMMENT
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });
    Comments.CreateComment memory commentData1 = Comments.CreateComment({
      content: "Test comment",
      metadata: new Metadata.MetadataEntry[](0),
      targetUri: "",
      commentType: 0, // COMMENT_TYPE_COMMENT
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 2 days,
      parentId: bytes32(0)
    });
    Comments.CreateComment memory commentData2 = Comments.CreateComment({
      content: "Test comment",
      metadata: new Metadata.MetadataEntry[](0),
      targetUri: "",
      commentType: 0, // COMMENT_TYPE_COMMENT
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 3 days,
      parentId: bytes32(0)
    });

    // Make a few comments to collect fees
    bytes memory appSignature = _signAppSignature(commentData);
    vm.prank(user1);
    comments.postComment{ value: TOTAL_FEE_WITH_PROTOCOL }(
      commentData,
      appSignature
    );
    bytes memory appSignature1 = _signAppSignature(commentData1);
    vm.prank(user1);
    comments.postComment{ value: TOTAL_FEE_WITH_PROTOCOL }(
      commentData1,
      appSignature1
    );
    bytes memory appSignature2 = _signAppSignature(commentData2);
    vm.prank(user1);
    comments.postComment{ value: TOTAL_FEE_WITH_PROTOCOL }(
      commentData2,
      appSignature2
    );

    uint256 feeCollectorBalanceBefore = feeCollector.balance;

    // Withdraw fees
    vm.prank(feeCollector);
    vm.expectEmit(true, true, false, true);
    emit FeeWithdrawn(feeCollector, HOOK_FEE * 3);
    feeHook.withdrawFees();

    // Check balances
    assertEq(feeCollector.balance - feeCollectorBalanceBefore, HOOK_FEE * 3);
    assertEq(address(feeHook).balance, 0);
    assertEq(feeHook.totalFeesCollected(), 0);
  }

  function test_FlatFeeHookOnlyFeeCollectorCanWithdraw() public {
    // Try to withdraw as non-fee collector
    vm.prank(user1);
    vm.expectRevert("Only fee collector");
    feeHook.withdrawFees();
  }

  function test_FlatFeeHookCannotWithdrawWithNoFees() public {
    vm.prank(feeCollector);
    vm.expectRevert("No fees to withdraw");
    feeHook.withdrawFees();
  }

  function test_FlatFeeHookEstimatedAddCommentFeeIsAccurate() public {
    // Create channel with fee hook
    uint256 channelId = channelManager.createChannel{
      value: CHANNEL_CREATION_FEE
    }(
      "Fee Channel",
      "Pay 0.001 ETH to comment",
      new Metadata.MetadataEntry[](0),
      address(feeHook)
    );

    string memory content = "Test comment";
    string memory targetUri = "";
    Metadata.MetadataEntry[] memory metadata = new Metadata.MetadataEntry[](0);

    Comments.CreateComment memory createCommentData = Comments.CreateComment({
      content: content,
      metadata: metadata,
      targetUri: targetUri,
      commentType: 0, // COMMENT_TYPE_COMMENT
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    // Create a corresponding comment data object for estimating the fee
    Comments.Comment memory commentData = Comments.Comment({
      content: content,
      targetUri: targetUri,
      commentType: 0,
      author: user1,
      app: user2,
      channelId: channelId,
      parentId: bytes32(0),
      createdAt: uint88(block.timestamp),
      updatedAt: uint88(block.timestamp),
      authMethod: Comments.AuthorAuthMethod.DIRECT_TX
    });

    bytes memory appSignature = _signAppSignature(createCommentData);

    uint256 hookBalanceBefore = address(feeHook).balance;
    uint256 user1BalanceBefore = user1.balance;

    FeeEstimatable.FeeEstimation memory feeEstimation = feeHook
      .estimateAddCommentFee(commentData, metadata, user1);

    assertEq(feeEstimation.asset, 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    IProtocolFees protocolFees = IProtocolFees(channelManager);

    uint256 totalFeeIncludingProtocolFee = protocolFees
      .getCommentCreationFee() +
      (feeEstimation.amount / (10000 - protocolFees.getHookTransactionFee())) *
      10000;

    assertEq(totalFeeIncludingProtocolFee, TOTAL_FEE_WITH_PROTOCOL);

    // Post comment as user1 with exact fee plus protocol fee
    vm.prank(user1);
    comments.postComment{ value: totalFeeIncludingProtocolFee }(
      createCommentData,
      appSignature
    );

    // Check that the hook received the hook fee (after protocol fee)
    assertEq(address(feeHook).balance - hookBalanceBefore, HOOK_FEE);
    // Check that user1 paid the total fee (including protocol fee)
    assertEq(user1BalanceBefore - user1.balance, TOTAL_FEE_WITH_PROTOCOL);
    // Check that the hook recorded the fee
    assertEq(feeHook.totalFeesCollected(), HOOK_FEE);

    emit log_named_uint("feeEstimation.amount", feeEstimation.amount);
    emit log_named_uint(
      "protocolFees.getCommentCreationFee()",
      protocolFees.getCommentCreationFee()
    );
    emit log_named_uint(
      "protocolFees.getHookTransactionFee()",
      protocolFees.getHookTransactionFee()
    );
    emit log_named_uint(
      "totalFeeIncludingProtocolFee",
      totalFeeIncludingProtocolFee
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
