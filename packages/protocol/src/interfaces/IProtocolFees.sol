// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @title IProtocolFees - Interface for managing protocol fees
/// @notice This interface defines functions for managing various protocol fees
interface IProtocolFees {
    /// @notice Error thrown when fee percentage is invalid (>100%)
    error InvalidFee();

    /// @notice Emitted when channel creation fee is updated
    /// @param newFee The new fee amount in wei
    event ChannelCreationFeeUpdated(uint96 newFee);

    /// @notice Emitted when hook transaction fee percentage is updated
    /// @param newBasisPoints The new fee basis points (1 basis points = 0.01%)
    event HookTransactionFeeUpdated(uint16 newBasisPoints);

    /// @notice Emitted when fees are withdrawn
    /// @param recipient The address receiving the fees
    /// @param amount The amount withdrawn
    event FeesWithdrawn(address indexed recipient, uint256 amount);

    /// @notice Sets the fee for creating a new channel
    /// @param fee The fee amount in wei
    function setChannelCreationFee(uint96 fee) external;

    /// @notice Gets the current channel creation fee
    /// @return fee The current fee in wei
    function getChannelCreationFee() external view returns (uint96 fee);

    /// @notice Sets the fee percentage taken from hook transactions
    /// @param feeBasisPoints The fee percentage in basis points (1 basis point = 0.01%)
    function setHookTransactionFee(uint16 feeBasisPoints) external;

    /// @notice Gets the current hook transaction fee percentage
    /// @return feeBasisPoints The current fee percentage in basis points (1 basis points = 0.01%)
    function getHookTransactionFee()
        external
        view
        returns (uint16 feeBasisPoints);

    /// @notice Withdraws accumulated fees to a specified address
    /// @param recipient The address to receive the fees
    /// @return amount The amount withdrawn
    function withdrawFees(address recipient) external returns (uint256 amount);

     /// @notice Collects channel creation fee
    /// @return The amount of fees collected
    function collectChannelCreationFee() external payable returns (uint96);

    /// @notice Collects hook transaction fee
    /// @param value The total value sent with the transaction
    /// @return hookValue The amount that should be passed to the hook
    function deductProtocolHookTransactionFee(
        uint256 value
    ) external view returns (uint256 hookValue);
}
