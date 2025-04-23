// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @title IFeeManager - Interface for managing protocol fees
/// @notice This interface defines functions for managing various protocol fees
interface IFeeManager {
    /// @notice Error thrown when fee percentage is invalid (>100%)
    error InvalidFeePercentage();

    /// @notice Emitted when channel creation fee is updated
    /// @param newFee The new fee amount in wei
    event ChannelCreationFeeUpdated(uint96 newFee);

    /// @notice Emitted when hook registration fee is updated
    /// @param newFee The new fee amount in wei
    event HookRegistrationFeeUpdated(uint96 newFee);

    /// @notice Emitted when hook transaction fee percentage is updated
    /// @param newFeePercentage The new fee percentage (in basis points, 1% = 100)
    event HookTransactionFeeUpdated(uint16 newFeePercentage);

    /// @notice Emitted when fees are withdrawn
    /// @param recipient The address receiving the fees
    /// @param amount The amount withdrawn
    event FeesWithdrawn(address indexed recipient, uint256 amount);

    /// @notice Sets the fee for creating a new channel
    /// @param fee The fee amount in wei
    function setChannelCreationFee(uint96 fee) external;

    /// @notice Sets the fee for registering a new hook
    /// @param fee The fee amount in wei
    function setHookRegistrationFee(uint96 fee) external;

    /// @notice Sets the fee percentage taken from hook transactions
    /// @param feePercentage The fee percentage in basis points (1% = 100)
    function setHookTransactionFee(uint16 feePercentage) external;

    /// @notice Gets the current channel creation fee
    /// @return fee The current fee in wei
    function getChannelCreationFee() external view returns (uint96 fee);

    /// @notice Gets the current hook registration fee
    /// @return fee The current fee in wei
    function getHookRegistrationFee() external view returns (uint96 fee);

    /// @notice Gets the current hook transaction fee percentage
    /// @return feePercentage The current fee percentage in basis points
    function getHookTransactionFee()
        external
        view
        returns (uint16 feePercentage);

    /// @notice Withdraws accumulated fees to a specified address
    /// @param recipient The address to receive the fees
    /// @return amount The amount withdrawn
    function withdrawFees(address recipient) external returns (uint256 amount);
}
