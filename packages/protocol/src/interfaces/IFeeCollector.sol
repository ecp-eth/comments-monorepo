// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ICommentTypes.sol";

interface IFeeCollector {
    /// @notice Collect fee for a comment operation
    /// @param commentData The complete comment data being posted
    function collectFee(
        ICommentTypes.CommentData calldata commentData
    ) external payable returns (bool);
    
    /// @notice Get the required fee amount for a given context
    /// @param commentData The complete comment data being posted
    function getFeeAmount(
        ICommentTypes.CommentData calldata commentData
    ) external view returns (uint256);

    /// @notice Get the current balance of fees available to withdraw for an address
    /// @param account The address to check the balance for
    /// @return The amount of fees available to withdraw
    function getBalance(address account) external view returns (uint256);

    /// @notice Withdraw accumulated fees
    /// @return success Whether the withdrawal was successful
    function withdraw() external returns (bool);
} 