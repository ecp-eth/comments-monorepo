// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IFeeManager.sol";
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
abstract contract ProtocolFees is IFeeManager, Ownable, ReentrancyGuard {
    // Fee configuration
    uint96 internal channelCreationFee;
    uint96 internal hookRegistrationFee;
    uint16 internal hookTransactionFeeBasisPoints; // (1 basis point = 0.01%)
    uint256 internal accumulatedFees;

    /// @notice Constructor sets the contract owner and initializes fees
    /// @param initialOwner The address that will own the contract
    constructor(address initialOwner) Ownable(initialOwner) {
        if (initialOwner == address(0)) revert IChannelManager.ZeroAddress();

        // Initialize fees with safe defaults
        channelCreationFee = 0.02 ether;
        hookRegistrationFee = 0.02 ether;
        // 2% fee on hook revenue
        hookTransactionFeeBasisPoints = 200;
        accumulatedFees = 0;
    }

    /// @notice Sets the fee for creating a new channel (only owner)
    /// @param fee The fee amount in wei
    function setChannelCreationFee(uint96 fee) external onlyOwner {
        channelCreationFee = fee;
        emit IFeeManager.ChannelCreationFeeUpdated(fee);
    }

    /// @notice Sets the fee for registering a new hook (only owner)
    /// @param fee The fee amount in wei
    function setHookRegistrationFee(uint96 fee) external onlyOwner {
        hookRegistrationFee = fee;
        emit IFeeManager.HookRegistrationFeeUpdated(fee);
    }

    /// @notice Sets the fee percentage taken from hook transactions (only owner)
    /// @param feeBasisPoints The fee percentage in basis points (1 basis point = 0.01%)
    function setHookTransactionFee(uint16 feeBasisPoints) external onlyOwner {
        if (feeBasisPoints > 10000) revert InvalidFeePercentage(); // Max 100%
        hookTransactionFeeBasisPoints = feeBasisPoints;
        emit IFeeManager.HookTransactionFeeUpdated(feeBasisPoints);
    }

    /// @notice Gets the current channel creation fee
    function getChannelCreationFee() external view returns (uint96) {
        return channelCreationFee;
    }

    /// @notice Gets the current hook registration fee
    function getHookRegistrationFee() external view returns (uint96) {
        return hookRegistrationFee;
    }

    /// @notice Gets the current hook transaction fee percentage in basis points
    function getHookTransactionFee() external view returns (uint16) {
        return hookTransactionFeeBasisPoints;
    }

    /// @notice Withdraws accumulated fees to a specified address (only owner)
    /// @param recipient The address to receive the fees
    /// @return amount The amount withdrawn
    function withdrawFees(
        address recipient
    ) external onlyOwner nonReentrant returns (uint256 amount) {
        if (recipient == address(0)) revert IChannelManager.ZeroAddress();

        amount = accumulatedFees;
        accumulatedFees = 0;

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Fee withdrawal failed");

        emit IFeeManager.FeesWithdrawn(recipient, amount);
        return amount;
    }

    /// @notice Collects channel creation fee
    /// @return The amount of fees collected
    function collectChannelCreationFee() public payable returns (uint96) {
        return _collectFee(channelCreationFee);
    }

    /// @notice Collects hook registration fee
    /// @return The amount of fees collected
    function collectHookRegistrationFee() public payable returns (uint96) {
        return _collectFee(hookRegistrationFee);
    }

    /// @notice Collects hook transaction fee
    /// @param value The total value sent with the transaction
    /// @return hookValue The amount that should be passed to the hook
    function calculateHookTransactionFee(
        uint256 value
    ) public payable returns (uint256 hookValue) {
        if (value > 0 && hookTransactionFeeBasisPoints > 0) {
            uint256 protocolFee = (value * hookTransactionFeeBasisPoints) /
                10000;
            hookValue = value - protocolFee;
            accumulatedFees += protocolFee;
        } else {
            hookValue = value;
        }
        return hookValue;
    }

    /// @notice Internal function to handle fee collection and refunds
    /// @param requiredFee The fee amount required for the operation
    /// @return The amount of fees collected
    function _collectFee(uint96 requiredFee) internal virtual returns (uint96) {
        if (msg.value < requiredFee) revert IChannelManager.InsufficientFee();

        accumulatedFees += requiredFee;

        if (msg.value > requiredFee) {
            // Refund excess payment
            (bool success, ) = msg.sender.call{value: msg.value - requiredFee}(
                ""
            );
            require(success, "Refund failed");
        }

        return requiredFee;
    }

    /// @notice Fallback function to receive ETH
    receive() external payable {
        accumulatedFees += msg.value;
    }
}
