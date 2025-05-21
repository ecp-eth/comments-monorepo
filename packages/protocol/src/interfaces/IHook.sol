// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "../libraries/Hooks.sol";
import "../libraries/Comments.sol";
import "../libraries/Channels.sol";

interface IHook is IERC165 {
  function getHookPermissions()
    external
    pure
    returns (Hooks.Permissions memory);

  /// @notice Execute after a hook is initialized on a channel
  /// @param channel The address of the channel the hook was added to
  /// @param channelId The unique identifier of the channel the hook was added to
  /// @return success Whether the hook initialization was successful
  function onInitialized(
    address channel,
    uint256 channelId
  ) external returns (bool success);

  /// @notice Execute after a comment is processed
  /// @param commentData The comment data that was processed
  /// @param msgSender The original msg.sender that initiated the transaction
  /// @param commentId The unique identifier of the processed comment
  /// @return hookData The comment hook data that was generated
  function onCommentAdded(
    Comments.Comment calldata commentData,
    address msgSender,
    bytes32 commentId
  ) external payable returns (string memory hookData);

  /// @notice Execute after a comment is deleted
  /// @param commentData The comment data that was deleted
  /// @param msgSender The original msg.sender that initiated the transaction
  /// @param commentId The unique identifier of the deleted comment
  /// @return success Whether the hook execution was successful
  function onCommentDeleted(
    Comments.Comment calldata commentData,
    address msgSender,
    bytes32 commentId
  ) external payable returns (bool success);

  /// @notice Execute after a comment is edited
  /// @param commentData The comment data that was edited
  /// @param msgSender The original msg.sender that initiated the transaction
  /// @param commentId The unique identifier of the edited comment
  /// @return commentHookData The comment hook data that was generated
  function onCommentEdited(
    Comments.Comment calldata commentData,
    address msgSender,
    bytes32 commentId
  ) external payable returns (string memory commentHookData);

  /// @notice Execute after a channel is updated
  /// @param channel The address of the channel that was updated
  /// @param channelId The unique identifier of the channel that was updated
  /// @param channelData The data of the channel that was updated
  /// @return success Whether the channel update was successful
  function onChannelUpdated(
    address channel,
    uint256 channelId,
    Channels.Channel calldata channelData
  ) external returns (bool success);
}
