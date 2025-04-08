// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./ICommentTypes.sol";

interface IFeeCollector is IERC165 {
    /// @notice Collect fees for a comment
    /// @param commentData The comment data for fee collection
    /// @return success Whether the fee collection was successful
    function collectFee(
        ICommentTypes.CommentData calldata commentData
    ) external payable returns (bool success);

    /// @notice Get the required fee amount for a comment
    /// @param commentData The comment data to calculate fee for
    /// @return The fee amount in wei
    function getFeeAmount(
        ICommentTypes.CommentData calldata commentData
    ) external view returns (uint256);

    /// @notice Get the balance of fees collected for an address
    /// @param account The address to check balance for
    /// @return The balance in wei
    function getBalance(address account) external view returns (uint256);

    /// @notice Withdraw collected fees
    /// @return success Whether the withdrawal was successful
    function withdraw() external returns (bool success);
} 