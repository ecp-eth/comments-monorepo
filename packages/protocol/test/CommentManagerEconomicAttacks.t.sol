// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { Comments } from "../src/types/Comments.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { ICommentManager } from "../src/interfaces/ICommentManager.sol";
import { IProtocolFees } from "../src/interfaces/IProtocolFees.sol";
import { BaseHook } from "../src/hooks/BaseHook.sol";
import { Hooks } from "../src/types/Hooks.sol";
import { Metadata } from "../src/types/Metadata.sol";
import { TestUtils } from "./utils.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

error FeeManipulationAttempted();
error GasGriefingAttempted();

/**
 * @title Malicious Hook for Fee Manipulation Testing
 * @notice This hook attempts various fee manipulation attacks
 */
contract FeeManipulationHook is BaseHook {
  uint256 public constant FAKE_FEE = 0.1 ether;
  uint256 public constant ACTUAL_REQUIRED_FEE = 0.5 ether;
  bool public shouldManipulateFees;
  bool public shouldStealFees;
  bool public shouldRefundIncorrectly;
  address public feeThief;

  receive() external payable {
    // Steal fees sent to this contract
    if (shouldStealFees && feeThief != address(0)) {
      payable(feeThief).transfer(address(this).balance);
    }
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

  function setFeeManipulation(
    bool _shouldManipulate,
    bool _shouldSteal,
    address _thief
  ) external {
    shouldManipulateFees = _shouldManipulate;
    shouldStealFees = _shouldSteal;
    feeThief = _thief;
  }

  function _onCommentAdd(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal override returns (Metadata.MetadataEntry[] memory) {
    if (shouldManipulateFees) {
      // Claim we need the fake fee but actually require much more
      if (msg.value < ACTUAL_REQUIRED_FEE) {
        revert("Insufficient fee for hook operation");
      }

      // Steal excess fees
      if (shouldStealFees && msg.value > FAKE_FEE) {
        uint256 stolenAmount = msg.value - FAKE_FEE;
        payable(feeThief).transfer(stolenAmount);
      }
    }

    return new Metadata.MetadataEntry[](0);
  }
}

/**
 * @title Gas Griefing Hook
 * @notice This hook consumes excessive gas to test gas griefing protection
 */
contract GasGriefingHook is BaseHook {
  bool public shouldGrief;
  uint256 public gasToConsume;
  mapping(uint256 => uint256) public wasteStorage;

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
        onCommentDelete: true,
        onCommentEdit: true,
        onChannelUpdate: false,
        onCommentHookDataUpdate: false
      });
  }

  function setGasGriefing(bool _shouldGrief, uint256 _gasToConsume) external {
    shouldGrief = _shouldGrief;
    gasToConsume = _gasToConsume;
  }

  function _onCommentAdd(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal override returns (Metadata.MetadataEntry[] memory) {
    if (shouldGrief) {
      _consumeGas();
    }
    return new Metadata.MetadataEntry[](0);
  }

  function _onCommentEdit(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal override returns (Metadata.MetadataEntry[] memory) {
    if (shouldGrief) {
      _consumeGas();
    }
    return new Metadata.MetadataEntry[](0);
  }

  function _onCommentDelete(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal override returns (bool) {
    if (shouldGrief) {
      _consumeGas();
    }
    return true;
  }

  function _consumeGas() internal {
    uint256 startGas = gasleft();
    uint256 targetGas = startGas > gasToConsume ? startGas - gasToConsume : 0;

    uint256 counter = 0;
    while (gasleft() > targetGas && gasleft() > 5000) {
      wasteStorage[counter] = block.timestamp + counter;
      counter++;
    }
  }
}

/**
 * @title Fee Overflow Hook
 * @notice This hook tests fee calculation overflow scenarios
 */
contract FeeOverflowHook is BaseHook {
  bool public shouldCauseOverflow;

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

  function setCauseOverflow(bool _shouldCause) external {
    shouldCauseOverflow = _shouldCause;
  }

  function _onCommentAdd(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal override returns (Metadata.MetadataEntry[] memory) {
    if (shouldCauseOverflow) {
      // Try to cause overflow in fee calculations
      uint256 maxValue = type(uint256).max;
      require(msg.value > maxValue / 2, "Need more ETH for overflow test");
    }
    return new Metadata.MetadataEntry[](0);
  }
}

contract CommentManagerEconomicAttacksTest is Test, IERC721Receiver {
  CommentManager public comments;
  ChannelManager public channelManager;
  FeeManipulationHook public feeManipulationHook;
  GasGriefingHook public gasGriefingHook;
  FeeOverflowHook public feeOverflowHook;

  address public owner;
  address public author;
  address public app;
  address public attacker;
  address public feeThief;
  uint256 public authorPrivateKey = 0x1;
  uint256 public appPrivateKey = 0x2;
  uint256 public attackerPrivateKey = 0x4;
  uint256 public thiefPrivateKey = 0x5;

  fallback() external payable {
    // This function allows the contract to receive ETH
    // Used for testing fee-related attacks and value transfers
  }

  receive() external payable {
    // This function allows the contract to receive ETH
    // Used for testing fee-related attacks and value transfers
  }

  function setUp() public {
    owner = address(this);
    author = vm.addr(authorPrivateKey);
    app = vm.addr(appPrivateKey);
    attacker = vm.addr(attackerPrivateKey);
    feeThief = vm.addr(thiefPrivateKey);

    (comments, channelManager) = TestUtils.createContracts(owner);

    feeManipulationHook = new FeeManipulationHook();
    gasGriefingHook = new GasGriefingHook();
    feeOverflowHook = new FeeOverflowHook();

    vm.deal(author, 100 ether);
    vm.deal(app, 100 ether);
    vm.deal(attacker, 100 ether);
  }

  function test_ProtocolFeeCalculation_EdgeCases() public {
    // Test edge cases in protocol fee calculations

    // Test maximum valid fee percentage (100%)
    channelManager.setHookTransactionFee(10000); // 100%

    uint256 testAmount = 1 ether;
    uint256 hookValue = channelManager.deductProtocolHookTransactionFee(
      testAmount
    );
    assertEq(hookValue, 0, "100% fee should leave 0 for hook");

    // Test 0% fee
    channelManager.setHookTransactionFee(0);
    hookValue = channelManager.deductProtocolHookTransactionFee(testAmount);
    assertEq(hookValue, testAmount, "0% fee should leave full amount");

    // Test 50% fee
    channelManager.setHookTransactionFee(5000);
    hookValue = channelManager.deductProtocolHookTransactionFee(testAmount);
    assertEq(hookValue, 0.5 ether, "50% fee should leave half");
  }

  function test_HookFeeManipulation_ShouldFail() public {
    // Create channel with fee manipulation hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Fee Manipulation Channel",
      "Channel for testing fee manipulation",
      new Metadata.MetadataEntry[](0),
      address(feeManipulationHook)
    );

    feeManipulationHook.setFeeManipulation(true, true, feeThief);

    // Try to post comment with insufficient fee
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData.channelId = channelId;
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    uint256 fakeFeeManip = feeManipulationHook.FAKE_FEE();
    vm.expectRevert("Insufficient fee for hook operation");
    vm.prank(author);
    comments.postComment{ value: fakeFeeManip }(commentData, appSignature);
  }

  function test_HookFeeTheft_Detection() public {
    // Create channel with fee stealing hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Fee Theft Channel",
      "Channel for testing fee theft",
      new Metadata.MetadataEntry[](0),
      address(feeManipulationHook)
    );

    feeManipulationHook.setFeeManipulation(true, true, feeThief);

    uint256 thiefBalanceBefore = feeThief.balance;

    // Post comment with more than required fee
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment 10");
    commentData.channelId = channelId;
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    uint256 hookRequiredFee = feeManipulationHook.ACTUAL_REQUIRED_FEE();
    // Calculate total value needed to ensure hook receives the required fee after protocol fee
    uint256 totalValueNeeded = channelManager.calculateMsgValueWithHookFee(
      hookRequiredFee
    );
    vm.prank(author);
    comments.postComment{ value: totalValueNeeded }(commentData, appSignature);

    // Check if fees were stolen
    uint256 thiefBalanceAfter = feeThief.balance;
    uint256 expectedStolen = feeManipulationHook.ACTUAL_REQUIRED_FEE() -
      feeManipulationHook.FAKE_FEE();

    assertEq(
      thiefBalanceAfter - thiefBalanceBefore,
      expectedStolen,
      "Hook should have stolen excess fees"
    );
  }

  function test_GasGriefingAttack_ShouldComplete() public {
    // Create channel with gas griefing hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Gas Griefing Channel",
      "Channel for testing gas griefing",
      new Metadata.MetadataEntry[](0),
      address(gasGriefingHook)
    );

    // Set hook to consume a lot of gas
    gasGriefingHook.setGasGriefing(true, 200000); // Try to consume 200k gas

    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData.channelId = channelId;
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Transaction should still complete despite gas griefing
    uint256 gasBefore = gasleft();
    vm.prank(author);
    comments.postComment(commentData, appSignature);
    uint256 gasAfter = gasleft();

    // Verify comment was created despite gas griefing
    Comments.Comment memory storedComment = comments.getComment(commentId);
    assertEq(
      storedComment.author,
      author,
      "Comment should be created despite gas griefing"
    );

    // Verify significant gas was consumed
    assertTrue(
      gasBefore - gasAfter > 100000,
      "Significant gas should have been consumed"
    );
  }

  function test_BatchOperationFeeDistribution_Attack() public {
    // Test fee distribution manipulation in batch operations
    Comments.CreateComment memory commentData1 = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    Comments.CreateComment memory commentData2 = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");

    commentData1.content = "First comment";
    commentData2.content = "Second comment";

    bytes32 commentId1 = comments.getCommentId(commentData1);
    bytes32 commentId2 = comments.getCommentId(commentData2);

    bytes memory appSignature1 = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId1
    );
    bytes memory appSignature2 = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId2
    );

    // Create batch operation with unbalanced value distribution
    Comments.BatchOperation[] memory operations = new Comments.BatchOperation[](
      2
    );

    operations[0] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.POST_COMMENT,
      value: 1 ether, // High value for first operation
      data: abi.encode(commentData1),
      signatures: new bytes[](1)
    });
    operations[0].signatures[0] = appSignature1;

    operations[1] = Comments.BatchOperation({
      operationType: Comments.BatchOperationType.POST_COMMENT,
      value: 0, // No value for second operation
      data: abi.encode(commentData2),
      signatures: new bytes[](1)
    });
    operations[1].signatures[0] = appSignature2;

    // Should fail if total value doesn't match
    vm.prank(author);
    vm.expectRevert(); // Should revert due to value mismatch
    comments.batchOperations{ value: 0.5 ether }(operations);
  }

  function test_ExcessiveFeeRefund_Attack() public {
    // Test attack where user sends excess fees hoping for incorrect refund
    uint256 originalChannelFee = channelManager.getChannelCreationFee();

    // Set a reasonable channel fee
    channelManager.setChannelCreationFee(0.1 ether);

    uint256 attackerBalanceBefore = attacker.balance;

    // Attacker sends way more than required fee
    vm.prank(attacker);
    uint256 channelId = channelManager.createChannel{ value: 10 ether }(
      "Overpaid Channel",
      "Channel with excessive fee payment",
      new Metadata.MetadataEntry[](0),
      address(0)
    );

    uint256 attackerBalanceAfter = attacker.balance;
    uint256 actualCost = attackerBalanceBefore - attackerBalanceAfter;

    // Should only charge the required fee, refunding the excess
    assertEq(
      actualCost,
      0.1 ether,
      "Should only charge required fee and refund excess"
    );

    // Verify channel was created
    assertTrue(channelManager.channelExists(channelId), "Channel should exist");

    // Restore original fee
    channelManager.setChannelCreationFee(uint96(originalChannelFee));
  }

  function test_ProtocolFeeWithdrawal_OnlyOwner() public {
    // Test that only owner can withdraw protocol fees

    // Generate some fees by creating channels
    channelManager.setChannelCreationFee(1 ether);

    vm.prank(author);
    channelManager.createChannel{ value: 1 ether }(
      "Fee Generation Channel",
      "Generate fees for testing",
      new Metadata.MetadataEntry[](0),
      address(0)
    );

    // Non-owner should not be able to withdraw fees
    vm.prank(attacker);
    vm.expectRevert();
    channelManager.withdrawFees(attacker);

    // Owner should be able to withdraw fees
    uint256 ownerBalanceBefore = owner.balance;
    uint256 feeBalance = address(channelManager).balance;

    channelManager.withdrawFees(owner);

    uint256 ownerBalanceAfter = owner.balance;
    assertEq(
      ownerBalanceAfter - ownerBalanceBefore,
      feeBalance,
      "Owner should receive all fees"
    );
    assertEq(
      address(channelManager).balance,
      0,
      "Contract should have no remaining balance"
    );
  }

  function test_ZeroValueOperations_ShouldWork() public {
    // Test that operations work correctly with zero value
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Should work with zero value when no fees required
    vm.prank(author);
    comments.postComment{ value: 0 }(commentData, appSignature);

    // Verify comment was created
    Comments.Comment memory storedComment = comments.getComment(commentId);
    assertEq(
      storedComment.author,
      author,
      "Comment should be created with zero value"
    );
  }

  function test_MaximumValueOperations() public {
    // Test operations with maximum possible values
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Give author maximum possible ETH
    vm.deal(author, type(uint128).max);

    // Should handle large values without overflow
    vm.prank(author);
    comments.postComment{ value: 1000 ether }(commentData, appSignature);

    // Verify comment was created
    Comments.Comment memory storedComment = comments.getComment(commentId);
    assertEq(
      storedComment.author,
      author,
      "Comment should be created with large value"
    );
  }

  function test_FeeCalculationEdgeCases() public {
    // Test fee calculations at boundary values

    // Test with 1 wei
    uint256 hookValue = channelManager.deductProtocolHookTransactionFee(1);
    assertTrue(hookValue <= 1, "Should handle 1 wei correctly");

    // Test with maximum uint256
    vm.expectRevert(); // Should handle overflow gracefully
    channelManager.deductProtocolHookTransactionFee(type(uint256).max);
  }

  function test_HookFeeBypass_ShouldFail() public {
    // Create channel with fee manipulation hook that requires fees
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Fee Bypass Channel",
      "Channel for testing fee bypass",
      new Metadata.MetadataEntry[](0),
      address(feeManipulationHook)
    );

    feeManipulationHook.setFeeManipulation(true, false, address(0));

    // Try to bypass hook fees by sending to different channel
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData.channelId = 0; // Default channel with no fees
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Should work with default channel
    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // But should fail with fee-requiring channel
    commentData.channelId = channelId;
    commentId = comments.getCommentId(commentData);
    appSignature = TestUtils.signEIP712(vm, appPrivateKey, commentId);

    uint256 fakeFeeBypass = feeManipulationHook.FAKE_FEE();
    vm.expectRevert("Insufficient fee for hook operation");
    vm.prank(author);
    comments.postComment{ value: fakeFeeBypass }(commentData, appSignature);
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
