// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../types/Metadata.sol";
import "../types/Comments.sol";
import "../types/Channels.sol";
import "../interfaces/IHook.sol";
import "../interfaces/IChannelManager.sol";
import "../interfaces/ICommentManager.sol";
import "./MetadataOps.sol";

/// @title CommentOps - Library for comment-related operations
library CommentOps {
  /// @notice Create a new comment
  /// @param commentId The unique identifier for the comment
  /// @param commentData The comment creation data
  /// @param authMethod The authentication method used
  /// @param value The ETH value sent with the transaction
  /// @param commentCreationFee The protocol fee for comment creation
  /// @param channelManager The channel manager contract
  /// @param comments Storage mapping for comments
  /// @param commentMetadata Storage mapping for comment metadata
  /// @param commentMetadataKeys Storage mapping for comment metadata keys
  /// @param commentHookMetadata Storage mapping for comment hook metadata
  /// @param commentHookMetadataKeys Storage mapping for comment hook metadata keys
  /// @param msgSender The sender of the transaction
  function createComment(
    bytes32 commentId,
    Comments.CreateComment memory commentData,
    Comments.AuthorAuthMethod authMethod,
    uint256 value,
    uint96 commentCreationFee,
    IChannelManager channelManager,
    mapping(bytes32 => Comments.Comment) storage comments,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentMetadata,
    mapping(bytes32 => bytes32[]) storage commentMetadataKeys,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentHookMetadata,
    mapping(bytes32 => bytes32[]) storage commentHookMetadataKeys,
    address msgSender
  ) external {
    uint256 remainingValue = value - commentCreationFee;

    address author = commentData.author;
    address app = commentData.app;
    uint256 channelId = commentData.channelId;
    bytes32 parentId = commentData.parentId;
    string memory content = commentData.content;
    Metadata.MetadataEntry[] memory metadata = commentData.metadata;
    string memory targetUri = commentData.targetUri;
    uint8 commentType = commentData.commentType;
    uint88 timestampNow = uint88(block.timestamp);

    Comments.Comment storage comment = comments[commentId];

    comment.author = author;
    comment.app = app;
    comment.channelId = channelId;
    comment.parentId = parentId;
    comment.content = content;
    comment.targetUri = targetUri;
    comment.commentType = commentType;
    comment.authMethod = authMethod;
    comment.createdAt = timestampNow;
    comment.updatedAt = timestampNow;

    // emit event before calling the `onCommentAdd` hook to ensure the order of events is correct in the case of reentrancy
    emit ICommentManager.CommentAdded(
      commentId,
      author,
      app,
      channelId,
      parentId,
      uint96(timestampNow),
      content,
      targetUri,
      commentType,
      uint8(comment.authMethod),
      metadata
    );

    // Store metadata in mappings
    if (metadata.length > 0) {
      if (metadata.length > 1000) {
        revert ICommentManager.MetadataTooLong();
      }
      MetadataOps.storeCommentMetadata(
        commentId,
        metadata,
        commentMetadata,
        commentMetadataKeys
      );
    }

    Channels.Channel memory channel = channelManager.getChannel(channelId);

    if (channel.hook != address(0) && channel.permissions.onCommentAdd) {
      IHook hook = IHook(channel.hook);
      // Calculate hook value after protocol fee
      uint256 valueToPassToTheHook = channelManager
        .deductProtocolHookTransactionFee(remainingValue);
      if (remainingValue > valueToPassToTheHook) {
        // send the hook transaction fee to the channel manager
        payable(address(channelManager)).transfer(
          remainingValue - valueToPassToTheHook
        );
      }

      Metadata.MetadataEntry[] memory hookMetadata = hook.onCommentAdd{
        value: valueToPassToTheHook
      }(comment, metadata, msgSender, commentId);

      // Store hook metadata
      if (
        hookMetadata.length > 0 &&
        // don't store hook metadata if the hook re-entered to delete the comment
        comments[commentId].author != address(0)
      ) {
        if (hookMetadata.length > 1000) {
          revert ICommentManager.HookMetadataTooLong();
        }
        MetadataOps.storeCommentHookMetadata(
          commentId,
          hookMetadata,
          commentHookMetadata,
          commentHookMetadataKeys
        );
      }
    }
    // refund excess payment if any
    else if (remainingValue > 0) {
      payable(msgSender).transfer(remainingValue);
    }
  }

  /// @notice Edit an existing comment
  /// @param commentId The unique identifier of the comment to edit
  /// @param editData The comment edit data
  /// @param authMethod The authentication method used
  /// @param value The ETH value sent with the transaction
  /// @param channelManager The channel manager contract
  /// @param comments Storage mapping for comments
  /// @param commentMetadata Storage mapping for comment metadata
  /// @param commentMetadataKeys Storage mapping for comment metadata keys
  /// @param commentHookMetadata Storage mapping for comment hook metadata
  /// @param commentHookMetadataKeys Storage mapping for comment hook metadata keys
  /// @param msgSender The sender of the transaction
  function editComment(
    bytes32 commentId,
    Comments.EditComment memory editData,
    Comments.AuthorAuthMethod authMethod,
    uint256 value,
    IChannelManager channelManager,
    mapping(bytes32 => Comments.Comment) storage comments,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentMetadata,
    mapping(bytes32 => bytes32[]) storage commentMetadataKeys,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentHookMetadata,
    mapping(bytes32 => bytes32[]) storage commentHookMetadataKeys,
    address msgSender
  ) external {
    Comments.Comment storage comment = comments[commentId];

    string memory content = editData.content;
    Metadata.MetadataEntry[] memory metadata = editData.metadata;
    uint88 timestampNow = uint88(block.timestamp);

    comment.content = content;
    comment.updatedAt = timestampNow;
    comment.authMethod = authMethod;

    // Clear existing metadata
    MetadataOps.clearCommentMetadata(
      commentId,
      commentMetadata,
      commentMetadataKeys
    );

    // Store metadata in mappings
    if (metadata.length > 0) {
      if (metadata.length > 1000) {
        revert ICommentManager.MetadataTooLong();
      }
      MetadataOps.storeCommentMetadata(
        commentId,
        metadata,
        commentMetadata,
        commentMetadataKeys
      );
    }

    Channels.Channel memory channel = channelManager.getChannel(
      comment.channelId
    );

    // emit event before calling the `onCommentEdit` hook to ensure the order of events is correct in the case of reentrancy
    emit ICommentManager.CommentEdited(
      commentId,
      comment.author,
      editData.app,
      comment.channelId,
      comment.parentId,
      uint96(comment.createdAt),
      uint96(timestampNow),
      content,
      comment.targetUri,
      comment.commentType,
      uint8(comment.authMethod),
      metadata
    );

    if (channel.hook != address(0) && channel.permissions.onCommentEdit) {
      IHook hook = IHook(channel.hook);

      // Calculate hook value after protocol fee
      uint256 valueToPassToHook = channelManager
        .deductProtocolHookTransactionFee(value);
      if (value > valueToPassToHook) {
        payable(address(channelManager)).transfer(value - valueToPassToHook);
      }

      Metadata.MetadataEntry[] memory hookMetadata = hook.onCommentEdit{
        value: valueToPassToHook
      }(comment, metadata, msgSender, commentId);

      // Clear existing hook metadata
      MetadataOps.clearCommentHookMetadata(
        commentId,
        commentHookMetadata,
        commentHookMetadataKeys
      );
      // Store hook metadata
      if (
        hookMetadata.length > 0 &&
        // don't store hook metadata if the hook re-entered to delete the comment
        comments[commentId].author != address(0)
      ) {
        if (hookMetadata.length > 1000) {
          revert ICommentManager.HookMetadataTooLong();
        }
        MetadataOps.storeCommentHookMetadata(
          commentId,
          hookMetadata,
          commentHookMetadata,
          commentHookMetadataKeys
        );
      }
    } else if (value > 0) {
      // refund excess payment if any
      payable(msgSender).transfer(value);
    }
  }

  /// @notice Delete a comment
  /// @param commentId The unique identifier of the comment to delete
  /// @param author The address of the comment author
  /// @param channelManager The channel manager contract
  /// @param comments Storage mapping for comments
  /// @param deleted Storage mapping for deleted comments
  /// @param commentMetadata Storage mapping for comment metadata
  /// @param commentMetadataKeys Storage mapping for comment metadata keys
  /// @param commentHookMetadata Storage mapping for comment hook metadata
  /// @param commentHookMetadataKeys Storage mapping for comment hook metadata keys
  /// @param msgSender The sender of the transaction
  function deleteComment(
    bytes32 commentId,
    address author,
    IChannelManager channelManager,
    mapping(bytes32 => Comments.Comment) storage comments,
    mapping(bytes32 => bool) storage deleted,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentMetadata,
    mapping(bytes32 => bytes32[]) storage commentMetadataKeys,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentHookMetadata,
    mapping(bytes32 => bytes32[]) storage commentHookMetadataKeys,
    address msgSender
  ) external {
    Comments.Comment storage comment = comments[commentId];

    // Store comment data for hook
    Comments.Comment memory commentToDelete = comment;

    // Get metadata for hook
    Metadata.MetadataEntry[] memory metadata = MetadataOps.getCommentMetadata(
      commentId,
      commentMetadata,
      commentMetadataKeys
    );
    Metadata.MetadataEntry[] memory hookMetadata = MetadataOps
      .getCommentHookMetadata(
        commentId,
        commentHookMetadata,
        commentHookMetadataKeys
      );

    // Delete the comment and metadata
    delete comments[commentId];
    deleted[commentId] = true;
    MetadataOps.clearCommentMetadata(
      commentId,
      commentMetadata,
      commentMetadataKeys
    );
    MetadataOps.clearCommentHookMetadata(
      commentId,
      commentHookMetadata,
      commentHookMetadataKeys
    );

    Channels.Channel memory channel = channelManager.getChannel(
      commentToDelete.channelId
    );

    // emit event before calling the `onCommentDelete` hook to ensure the order of events is correct in the case of reentrancy
    emit ICommentManager.CommentDeleted(commentId, author);

    if (channel.hook != address(0) && channel.permissions.onCommentDelete) {
      IHook hook = IHook(channel.hook);
      hook.onCommentDelete(
        commentToDelete,
        metadata,
        hookMetadata,
        msgSender,
        commentId
      );
    }
  }

  /// @notice Update hook metadata for a comment
  /// @param commentId The unique identifier of the comment
  /// @param channelManager The channel manager contract
  /// @param comments Storage mapping for comments
  /// @param commentMetadata Storage mapping for comment metadata
  /// @param commentMetadataKeys Storage mapping for comment metadata keys
  /// @param commentHookMetadata Storage mapping for comment hook metadata
  /// @param commentHookMetadataKeys Storage mapping for comment hook metadata keys
  /// @param msgSender The sender of the transaction
  function updateCommentHookData(
    bytes32 commentId,
    IChannelManager channelManager,
    mapping(bytes32 => Comments.Comment) storage comments,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentMetadata,
    mapping(bytes32 => bytes32[]) storage commentMetadataKeys,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentHookMetadata,
    mapping(bytes32 => bytes32[]) storage commentHookMetadataKeys,
    address msgSender
  ) external {
    Comments.Comment storage comment = comments[commentId];

    Channels.Channel memory channel = channelManager.getChannel(
      comment.channelId
    );
    if (
      channel.hook == address(0) || !channel.permissions.onCommentHookDataUpdate
    ) {
      revert ICommentManager.HookNotEnabled();
    }

    // Get current metadata for hook
    Metadata.MetadataEntry[] memory metadata = MetadataOps.getCommentMetadata(
      commentId,
      commentMetadata,
      commentMetadataKeys
    );
    Metadata.MetadataEntry[] memory hookMetadata = MetadataOps
      .getCommentHookMetadata(
        commentId,
        commentHookMetadata,
        commentHookMetadataKeys
      );

    IHook hook = IHook(channel.hook);

    Metadata.MetadataEntryOp[] memory operations = hook.onCommentHookDataUpdate(
      comment,
      metadata,
      hookMetadata,
      msgSender,
      commentId
    );

    emit ICommentManager.CommentHookDataUpdate(commentId, operations);

    if (operations.length > 1000) {
      revert ICommentManager.HookMetadataTooLong();
    }

    // Apply hook metadata operations using merge mode (gas-efficient)
    for (uint i = 0; i < operations.length; i++) {
      Metadata.MetadataEntryOp memory op = operations[i];

      if (op.operation == Metadata.MetadataOperation.DELETE) {
        MetadataOps.deleteCommentHookMetadataKey(
          commentId,
          op.key,
          commentHookMetadata,
          commentHookMetadataKeys
        );
        emit ICommentManager.CommentHookMetadataSet(commentId, op.key, "");
      } else if (op.operation == Metadata.MetadataOperation.SET) {
        // Check if this is a new key for gas optimization
        bool isNewKey = !MetadataOps.hookMetadataKeyExists(
          commentId,
          op.key,
          commentHookMetadataKeys
        );

        commentHookMetadata[commentId][op.key] = op.value;

        // Only add to keys array if it's a new key
        if (isNewKey) {
          commentHookMetadataKeys[commentId].push(op.key);
        }

        emit ICommentManager.CommentHookMetadataSet(
          commentId,
          op.key,
          op.value
        );
      }
    }
  }
}
