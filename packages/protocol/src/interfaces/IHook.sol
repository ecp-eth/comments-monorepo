// SPDX-License-Identifier: MIT
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
  /// @param channelData The channel data that was used to initialize the hook
  /// @return success Whether the hook initialization was successful
  function onInitialize(
    address channel,
    Channels.Channel memory channelData,
    uint256 channelId
  ) external returns (bool success);

  /// @notice Execute after a comment is processed
  /// @param commentData The comment data that was processed
  /// @param metadata The metadata entries for the comment
  /// @param msgSender The original msg.sender that initiated the transaction
  /// @param commentId The unique identifier of the processed comment
  /// @return hookMetadata The hook metadata entries that were generated
  function onCommentAdd(
    Comments.Comment calldata commentData,
    Comments.MetadataEntry[] calldata metadata,
    address msgSender,
    bytes32 commentId
  ) external payable returns (Comments.MetadataEntry[] memory hookMetadata);

  /// @notice Execute after a comment is deleted
  /// @param commentData The comment data that was deleted
  /// @param metadata The metadata entries for the comment
  /// @param hookMetadata The hook metadata entries for the comment
  /// @param msgSender The original msg.sender that initiated the transaction
  /// @param commentId The unique identifier of the deleted comment
  /// @return success Whether the hook execution was successful
  function onCommentDelete(
    Comments.Comment calldata commentData,
    Comments.MetadataEntry[] calldata metadata,
    Comments.MetadataEntry[] calldata hookMetadata,
    address msgSender,
    bytes32 commentId
  ) external payable returns (bool success);

  /// @notice Execute after a comment is edited
  /// @param commentData The comment data that was edited
  /// @param metadata The metadata entries for the comment
  /// @param msgSender The original msg.sender that initiated the transaction
  /// @param commentId The unique identifier of the edited comment
  /// @return hookMetadata The hook metadata entries that were generated
  function onCommentEdit(
    Comments.Comment calldata commentData,
    Comments.MetadataEntry[] calldata metadata,
    address msgSender,
    bytes32 commentId
  ) external payable returns (Comments.MetadataEntry[] memory hookMetadata);

  /// @notice Execute after a channel is updated
  /// @param channel The address of the channel that was updated
  /// @param channelId The unique identifier of the channel that was updated
  /// @param channelData The data of the channel that was updated
  /// @return success Whether the channel update was successful
  function onChannelUpdate(
    address channel,
    uint256 channelId,
    Channels.Channel calldata channelData
  ) external returns (bool success);

  /// @notice Execute to update hook data for an existing comment
  /// @param commentData The comment data to update
  /// @param metadata The current metadata entries for the comment
  /// @param hookMetadata The current hook metadata entries for the comment
  /// @param msgSender The original msg.sender that initiated the transaction
  /// @param commentId The unique identifier of the comment to update
  /// @return operations The explicit metadata operations to perform (SET or DELETE)
  function onCommentHookDataUpdate(
    Comments.Comment calldata commentData,
    Comments.MetadataEntry[] calldata metadata,
    Comments.MetadataEntry[] calldata hookMetadata,
    address msgSender,
    bytes32 commentId
  ) external returns (Comments.HookMetadataUpdate[] memory operations);
}
