// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./ICommentTypes.sol";

interface IHook is IERC165 {
    /// @notice Execute before a comment is processed
    /// @param commentData The comment data to process
    /// @return success Whether the hook execution was successful
    function beforeComment(
        ICommentTypes.CommentData calldata commentData
    ) external payable returns (bool success);

    /// @notice Execute after a comment is processed
    /// @param commentData The comment data that was processed
    /// @return success Whether the hook execution was successful
    function afterComment(
        ICommentTypes.CommentData calldata commentData
    ) external returns (bool success);
} 