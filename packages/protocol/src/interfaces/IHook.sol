// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "../libraries/Hooks.sol";
import "../libraries/Comments.sol";

interface IHook is IERC165 {
    function getHookPermissions() external pure returns (Hooks.Permissions memory);

    /// @notice Execute after a hook is initialized on a channel
    /// @param channel The address of the channel the hook was added to
    /// @return success Whether the hook initialization was successful
    function afterInitialize(address channel) external returns (bool success);

    /// @notice Execute after a comment is processed
    /// @param commentData The comment data that was processed
    /// @param caller The original msg.sender that initiated the transaction
    /// @param commentId The unique identifier of the processed comment
    /// @return commentHookData The comment hook data that was generated
    function afterComment(
        Comments.Comment calldata commentData,
        address caller,
        bytes32 commentId
    ) external payable returns (string memory commentHookData);

    /// @notice Execute after a comment is deleted
    /// @param commentData The comment data that was deleted
    /// @param caller The original msg.sender that initiated the transaction
    /// @param commentId The unique identifier of the deleted comment
    /// @return success Whether the hook execution was successful
    function afterDeleteComment(
        Comments.Comment calldata commentData,
        address caller,
        bytes32 commentId
    ) external payable returns (bool success);
}
