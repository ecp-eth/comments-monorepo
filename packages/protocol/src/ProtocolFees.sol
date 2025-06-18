// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "solady/auth/Ownable.sol";
import "solady/utils/ReentrancyGuard.sol";
import "./interfaces/IProtocolFees.sol";
import "./interfaces/IChannelManager.sol";

/// @title ProtocolFees - Abstract contract for managing protocol fees
/// @notice This contract handles all fee-related functionality including channel creation, hook registration, and transaction fees
/// @dev Implements fee management with the following features:
/// 1. Fee Configuration:
///    - Channel creation fee
///    - Hook registration fee
///    - Hook transaction fee percentage
/// 2. Fee Collection:
///    - Accumulates fees from various operations
///    - Allows withdrawal of accumulated fees
/// 3. Fee Updates:
///    - Only owner can update fee amounts
///    - Fee percentage capped at 100%
abstract contract ProtocolFees is IProtocolFees, ReentrancyGuard, Ownable {
  // Fee configuration
  uint96 internal channelCreationFee;
  uint96 internal commentCreationFee;
  uint16 internal hookTransactionFeeBasisPoints; // (1 basis point = 0.01%)

  /// @notice Constructor sets the initial owner
  /// @param initialOwner The address that will own the contract
  constructor(address initialOwner) {
    if (initialOwner == address(0)) revert IChannelManager.ZeroAddress();

    _initializeOwner(initialOwner);

    // Initialize fees with safe defaults
    // Initialize channel creation fees to reduce initial spammy channels
    channelCreationFee = 0.02 ether;
    // Make a future implementation of comment creation fees at subcent levels to be enabled, in the case of hooks monetizing via ERC20s that bypass hookTransactionFeeBasisPoints
    commentCreationFee = 0;
    // 2% fee on hook ETH revenue
    hookTransactionFeeBasisPoints = 200;
  }

  /// @inheritdoc IProtocolFees
  function setChannelCreationFee(uint96 fee) external onlyOwner {
    channelCreationFee = fee;
    emit IProtocolFees.ChannelCreationFeeUpdated(fee);
  }

  /// @inheritdoc IProtocolFees
  function setCommentCreationFee(uint96 fee) external onlyOwner {
    commentCreationFee = fee;
    emit IProtocolFees.CommentCreationFeeUpdated(fee);
  }

  /// @inheritdoc IProtocolFees
  function setHookTransactionFee(uint16 feeBasisPoints) external onlyOwner {
    if (feeBasisPoints > 10000) revert InvalidFee(); // Max 100%
    hookTransactionFeeBasisPoints = feeBasisPoints;
    emit IProtocolFees.HookTransactionFeeUpdated(feeBasisPoints);
  }

  /// @inheritdoc IProtocolFees
  function getChannelCreationFee() external view returns (uint96) {
    return channelCreationFee;
  }

  /// @inheritdoc IProtocolFees
  function getCommentCreationFee() external view returns (uint96) {
    return commentCreationFee;
  }

  /// @inheritdoc IProtocolFees
  function getHookTransactionFee() external view returns (uint16) {
    return hookTransactionFeeBasisPoints;
  }

  /// @inheritdoc IProtocolFees
  function withdrawFees(
    address recipient
  ) external onlyOwner nonReentrant returns (uint256 amount) {
    if (recipient == address(0)) revert IChannelManager.ZeroAddress();

    amount = address(this).balance;

    (bool success, ) = recipient.call{ value: amount }("");
    require(success, "Fee withdrawal failed");

    emit IProtocolFees.FeesWithdrawn(recipient, amount);
    return amount;
  }

  /// @notice Collects the protocol fee for channel creation
  /// @return The amount of fees collected
  function _collectChannelCreationFee() internal returns (uint96) {
    return _collectFeeWithRefund(channelCreationFee);
  }

  /// @inheritdoc IProtocolFees
  function collectCommentCreationFee() external payable returns (uint96) {
    return _collectFeeWithRefund(commentCreationFee);
  }

  /// @notice Internal function to guard against insufficient fee with refund of excess
  /// @param requiredFee The fee amount required for the operation
  /// @return The amount of fees collected
  function _collectFeeWithRefund(
    uint96 requiredFee
  ) internal virtual returns (uint96) {
    if (msg.value < requiredFee) revert InsufficientFee();

    if (msg.value > requiredFee) {
      // Refund excess payment using transfer for safety
      payable(msg.sender).transfer(msg.value - requiredFee);
    }

    return requiredFee;
  }

  /// @inheritdoc IProtocolFees
  function deductProtocolHookTransactionFee(
    uint256 value
  ) external view returns (uint256 hookValue) {
    // Cache storage variable
    uint16 fee = hookTransactionFeeBasisPoints;
    if (value <= 0 || fee <= 0) {
      return value;
    }
    uint256 protocolFee = (value * fee) / 10000;
    return value - protocolFee;
  }

  /// @inheritdoc IProtocolFees
  function calculateMsgValueWithHookFee(
    uint256 postFeeAmountForwardedToHook
  ) external view returns (uint256) {
    if (hookTransactionFeeBasisPoints == 0) return postFeeAmountForwardedToHook;
    // invalid fee basis points
    if (hookTransactionFeeBasisPoints >= 10000) return 0;

    // Formula: postFeeAmountForwardedToHook = input - (input * feeBasisPoints / 10000)
    // Solving for input: input = postFeeAmountForwardedToHook / (1 - feeBasisPoints/10000)
    return
      (postFeeAmountForwardedToHook * 10000) /
      (10000 - hookTransactionFeeBasisPoints);
  }

  /// @notice Allows the contract to receive ETH
  receive() external payable {}
}
