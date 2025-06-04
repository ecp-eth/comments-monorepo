// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
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
abstract contract ProtocolFees is IProtocolFees, Ownable, ReentrancyGuard {
  // Fee configuration
  uint96 internal channelCreationFee;
  uint16 internal hookTransactionFeeBasisPoints; // (1 basis point = 0.01%)

  /// @notice Constructor sets the contract owner and initializes fees
  /// @param initialOwner The address that will own the contract
  constructor(address initialOwner) Ownable(initialOwner) {
    if (initialOwner == address(0)) revert IChannelManager.ZeroAddress();

    // Initialize fees with safe defaults
    channelCreationFee = 0.02 ether;
    // 2% fee on hook revenue
    hookTransactionFeeBasisPoints = 200;
  }

  /// @inheritdoc IProtocolFees
  function setChannelCreationFee(uint96 fee) external onlyOwner {
    channelCreationFee = fee;
    emit IProtocolFees.ChannelCreationFeeUpdated(fee);
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

  /// @notice Guard against insufficient channel creation fee
  /// @return The amount of fees collected
  function collectChannelCreationFee() internal returns (uint96) {
    return _collectFee(channelCreationFee);
  }

  /// @notice Calculates the hook transaction fee by deducting the protocol fee
  /// @param value The total value sent with the transaction
  /// @return hookValue The amount that should be passed to the hook
  function deductProtocolHookTransactionFee(
    uint256 value
  ) external view returns (uint256 hookValue) {
    if (value <= 0 || hookTransactionFeeBasisPoints <= 0) {
      return value;
    }

    uint256 protocolFee = (value * hookTransactionFeeBasisPoints) / 10000;
    return value - protocolFee;
  }

  /// @notice Internal function to guard against insufficient fee
  /// @param requiredFee The fee amount required for the operation
  /// @return The amount of fees collected
  function _collectFee(uint96 requiredFee) internal virtual returns (uint96) {
    if (msg.value < requiredFee) revert InsufficientFee();

    if (msg.value > requiredFee) {
      // Refund excess payment using transfer for safety
      payable(msg.sender).transfer(msg.value - requiredFee);
    }

    return requiredFee;
  }
}
