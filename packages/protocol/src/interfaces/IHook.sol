// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./ICommentTypes.sol";

interface IHook is IERC165 {
    /// @notice Execute before a comment is processed
    /// @param commentData The comment data to process
    /// @param caller The original msg.sender that initiated the transaction
    /// @param commentId The unique identifier of the comment being processed
    /// @return success Whether the hook execution was successful
    function beforeComment(
        ICommentTypes.CommentData calldata commentData,
        address caller,
        bytes32 commentId
    ) external payable returns (bool success);

    /// @notice Execute after a comment is processed
    /// @param commentData The comment data that was processed
    /// @param caller The original msg.sender that initiated the transaction
    /// @param commentId The unique identifier of the processed comment
    /// @return success Whether the hook execution was successful
    function afterComment(
        ICommentTypes.CommentData calldata commentData,
        address caller,
        bytes32 commentId
    ) external returns (bool success);
} 