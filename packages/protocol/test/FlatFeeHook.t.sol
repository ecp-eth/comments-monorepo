// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { IChannelManager } from "../src/interfaces/IChannelManager.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { TestUtils } from "./utils.sol";
import { BaseHook } from "../src/hooks/BaseHook.sol";
import { Hooks } from "../src/libraries/Hooks.sol";
import { Comments } from "../src/libraries/Comments.sol";
import { Metadata } from "../src/libraries/Metadata.sol";

// Fee charging hook contract
contract FlatFeeHook is BaseHook {
  uint256 public constant COMMENT_FEE = 0.001 ether;
  uint256 public constant PROTOCOL_FEE_PERCENTAGE = 1000; // 10%
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
  uint256 constant COMMENT_FEE = 0.001 ether;
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

  function test_FeeHookCollectsExactFee() public {
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

  function test_FeeHookRefundsExcessPaymentExceptProtocolFee() public {
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

  function test_FeeHookRejectsInsufficientFee() public {
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

  function test_FeeWithdrawal() public {
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

    // Make a few comments to collect fees
    for (uint i = 0; i < 3; i++) {
      bytes memory appSignature = _signAppSignature(commentData);
      vm.prank(user1);
      comments.postComment{ value: TOTAL_FEE_WITH_PROTOCOL }(
        commentData,
        appSignature
      );
    }

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

  function test_OnlyFeeCollectorCanWithdraw() public {
    // Try to withdraw as non-fee collector
    vm.prank(user1);
    vm.expectRevert("Only fee collector");
    feeHook.withdrawFees();
  }

  function test_CannotWithdrawWithNoFees() public {
    vm.prank(feeCollector);
    vm.expectRevert("No fees to withdraw");
    feeHook.withdrawFees();
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
