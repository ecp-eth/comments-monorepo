// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Metadata } from "./Metadata.sol";
import "../interfaces/IHook.sol";
import "../interfaces/IChannelManager.sol";
import "../interfaces/ICommentManager.sol";
import "../libraries/Channels.sol";

/// @title Comments - Library defining comment-related types and operations
library Comments {
  using Metadata for *;
  /// @notice Comment type constants
  /// @dev Type 0: Standard comment
  /// @dev Type 1: Reaction (with reaction type in content field, e.g. "like", "dislike", "heart")
  /// more types can be added in the future, please check the docs for more information.
  uint8 public constant COMMENT_TYPE_COMMENT = 0;
  uint8 public constant COMMENT_TYPE_REACTION = 1;

  /// @notice Author Authentication method used to create the comment
  /// @dev DIRECT_TX: User signed transaction directly (msg.sender == author).
  /// @dev APP_APPROVAL: User has pre-approved the app that signed the comment (approvals[author][app] == true)
  /// @dev AUTHOR_SIGNATURE: User signed the comment hash, the app submitted the comment on their behalf (gas-sponsored)
  enum AuthorAuthMethod {
    DIRECT_TX, // 0
    APP_APPROVAL, // 1
    AUTHOR_SIGNATURE // 2
  }

  /// @notice Struct containing all comment data
  /// @param author The address of the comment author
  /// @param createdAt The timestamp when the comment was created
  /// @param app The address of the application signer that authorized this comment
  /// @param updatedAt The timestamp when the comment was last updated
  /// @param commentType The type of the comment (0=comment, 1=reaction)
  /// @param authMethod The authentication method used to create this comment
  /// @param channelId The channel ID associated with the comment
  /// @param parentId The ID of the parent comment if this is a reply, otherwise bytes32(0)
  /// @param content The text content of the comment - may contain urls, images and mentions
  /// @param targetUri the URI about which the comment is being made
  struct Comment {
    // Pack these fields together (saves 1 storage slot)
    address author; // 20 bytes   --┬-- 32 bytes
    uint88 createdAt; // 11 bytes --┘
    uint8 authMethod; // 1 byte --┘
    address app; // 20 bytes      --┬-- 32 bytes
    uint88 updatedAt; // 11 bytes --┘
    uint8 commentType; // 1 byte --┘
    // 32-byte types
    uint256 channelId;
    bytes32 parentId;
    // Dynamic types last (conventional pattern)
    string content;
    string targetUri;
  }

  /// @notice Struct containing all comment data for creating a comment
  /// @param author The address of the comment author
  /// @param app The address of the application signer that authorized this comment
  /// @param channelId The channel ID associated with the comment
  /// @param deadline Timestamp after which the signatures for this comment become invalid
  /// @param parentId The ID of the parent comment if this is a reply, otherwise bytes32(0)
  /// @param content The actual text content of the comment. If the commentType is COMMENT_TYPE_REACTION, the content should be the reaction type, such as "like", "downvote", "repost" etc.
  /// @param metadata Array of key-value pairs for additional data
  /// @param targetUri the URI about which the comment is being made
  /// @param commentType The type of the comment (0=comment, 1=reaction)
  struct CreateComment {
    address author;
    address app;
    uint256 channelId;
    uint256 deadline;
    bytes32 parentId;
    uint8 commentType;
    // Dynamic types last (conventional pattern)
    string content;
    Metadata.MetadataEntry[] metadata;
    string targetUri;
  }

  /// @notice Struct containing all comment data for editing a comment
  /// @param app The address of the application signer that authorized this comment
  /// @param nonce The nonce for the comment
  /// @param deadline Timestamp after which the signatures for this comment become invalid
  /// @param content The actual text content of the comment
  /// @param metadata Array of key-value pairs for additional data
  struct EditComment {
    address app;
    uint256 nonce;
    uint256 deadline;
    string content;
    Metadata.MetadataEntry[] metadata;
  }

  // Batch operation structures

  /// @notice Enum for different operation types in batch calls
  enum BatchOperationType {
    POST_COMMENT, // 0
    POST_COMMENT_WITH_SIG, // 1
    EDIT_COMMENT, // 2
    EDIT_COMMENT_WITH_SIG, // 3
    DELETE_COMMENT, // 4
    DELETE_COMMENT_WITH_SIG // 5
  }

  /// @notice Struct for batch delete operation data
  /// @param commentId The unique identifier of the comment to delete
  /// @param app The address of the app signer (only for deleteCommentWithSig)
  /// @param deadline Timestamp after which the signature becomes invalid (only for deleteCommentWithSig)
  struct BatchDeleteData {
    bytes32 commentId;
    address app;
    uint256 deadline;
  }

  /// @notice Struct containing a single batch operation
  /// @param operationType The type of operation to perform
  /// @param value The amount of ETH to send with this operation
  /// @param data Encoded operation-specific data
  /// @param signatures Array of signatures required for this operation
  struct BatchOperation {
    BatchOperationType operationType;
    uint256 value;
    bytes data;
    bytes[] signatures;
  }

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
    CreateComment memory commentData,
    AuthorAuthMethod authMethod,
    uint256 value,
    uint96 commentCreationFee,
    IChannelManager channelManager,
    mapping(bytes32 => Comment) storage comments,
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

    Comment storage comment = comments[commentId];

    comment.author = author;
    comment.app = app;
    comment.channelId = channelId;
    comment.parentId = parentId;
    comment.content = content;
    comment.targetUri = targetUri;
    comment.commentType = commentType;
    comment.authMethod = uint8(authMethod);
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
      comment.authMethod,
      metadata
    );

    // Store metadata in mappings
    if (metadata.length > 0) {
      for (uint i = 0; i < metadata.length; i++) {
        bytes32 key = metadata[i].key;
        bytes memory val = metadata[i].value;

        commentMetadata[commentId][key] = val;
        commentMetadataKeys[commentId].push(key);

        emit ICommentManager.CommentMetadataSet(commentId, key, val);
      }
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
      if (hookMetadata.length > 0) {
        Metadata.storeCommentHookMetadata(
          commentId,
          hookMetadata,
          commentHookMetadata,
          commentHookMetadataKeys
        );

        for (uint i = 0; i < hookMetadata.length; i++) {
          emit ICommentManager.CommentHookMetadataSet(
            commentId,
            hookMetadata[i].key,
            hookMetadata[i].value
          );
        }
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
    EditComment memory editData,
    AuthorAuthMethod authMethod,
    uint256 value,
    IChannelManager channelManager,
    mapping(bytes32 => Comment) storage comments,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentMetadata,
    mapping(bytes32 => bytes32[]) storage commentMetadataKeys,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentHookMetadata,
    mapping(bytes32 => bytes32[]) storage commentHookMetadataKeys,
    address msgSender
  ) external {
    Comment storage comment = comments[commentId];

    string memory content = editData.content;
    Metadata.MetadataEntry[] memory metadata = editData.metadata;
    uint88 timestampNow = uint88(block.timestamp);

    comment.content = content;
    comment.updatedAt = timestampNow;
    comment.authMethod = uint8(authMethod);

    // Clear existing metadata
    Metadata.clearCommentMetadata(
      commentId,
      commentMetadata,
      commentMetadataKeys
    );

    // Store new metadata
    for (uint i = 0; i < metadata.length; i++) {
      bytes32 key = metadata[i].key;
      bytes memory val = metadata[i].value;

      commentMetadata[commentId][key] = val;
      commentMetadataKeys[commentId].push(key);

      emit ICommentManager.CommentMetadataSet(commentId, key, val);
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
      comment.authMethod,
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
      Metadata.clearCommentHookMetadata(
        commentId,
        commentHookMetadata,
        commentHookMetadataKeys
      );

      // Store new hook metadata
      for (uint i = 0; i < hookMetadata.length; i++) {
        bytes32 key = hookMetadata[i].key;
        bytes memory val = hookMetadata[i].value;

        commentHookMetadata[commentId][key] = val;
        commentHookMetadataKeys[commentId].push(key);

        emit ICommentManager.CommentHookMetadataSet(commentId, key, val);
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
  /// @param msgValue The ETH value sent with the transaction
  function deleteComment(
    bytes32 commentId,
    address author,
    IChannelManager channelManager,
    mapping(bytes32 => Comment) storage comments,
    mapping(bytes32 => bool) storage deleted,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentMetadata,
    mapping(bytes32 => bytes32[]) storage commentMetadataKeys,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentHookMetadata,
    mapping(bytes32 => bytes32[]) storage commentHookMetadataKeys,
    address msgSender,
    uint256 msgValue
  ) external {
    Comment storage comment = comments[commentId];

    // Store comment data for hook
    Comment memory commentToDelete = comment;

    // Get metadata for hook
    Metadata.MetadataEntry[] memory metadata = Metadata.getCommentMetadata(
      commentId,
      commentMetadata,
      commentMetadataKeys
    );
    Metadata.MetadataEntry[] memory hookMetadata = Metadata
      .getCommentHookMetadata(
        commentId,
        commentHookMetadata,
        commentHookMetadataKeys
      );

    // Delete the comment and metadata
    delete comments[commentId];
    deleted[commentId] = true;
    Metadata.clearCommentMetadata(
      commentId,
      commentMetadata,
      commentMetadataKeys
    );
    Metadata.clearCommentHookMetadata(
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
      // Calculate hook value after protocol fee
      uint256 msgValueAfterFee = channelManager
        .deductProtocolHookTransactionFee(msgValue);

      hook.onCommentDelete{ value: msgValueAfterFee }(
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
    mapping(bytes32 => Comment) storage comments,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentMetadata,
    mapping(bytes32 => bytes32[]) storage commentMetadataKeys,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentHookMetadata,
    mapping(bytes32 => bytes32[]) storage commentHookMetadataKeys,
    address msgSender
  ) external {
    Comment storage comment = comments[commentId];

    Channels.Channel memory channel = channelManager.getChannel(
      comment.channelId
    );
    if (
      channel.hook == address(0) || !channel.permissions.onCommentHookDataUpdate
    ) {
      revert ICommentManager.HookNotEnabled();
    }

    // Get current metadata for hook
    Metadata.MetadataEntry[] memory metadata = Metadata.getCommentMetadata(
      commentId,
      commentMetadata,
      commentMetadataKeys
    );
    Metadata.MetadataEntry[] memory hookMetadata = Metadata
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

    // Apply hook metadata operations using merge mode (gas-efficient)
    for (uint i = 0; i < operations.length; i++) {
      Metadata.MetadataEntryOp memory op = operations[i];

      if (op.operation == Metadata.MetadataOperation.DELETE) {
        Metadata.deleteCommentHookMetadataKey(
          commentId,
          op.key,
          commentHookMetadata,
          commentHookMetadataKeys
        );
        emit ICommentManager.CommentHookMetadataSet(commentId, op.key, "");
      } else if (op.operation == Metadata.MetadataOperation.SET) {
        // Check if this is a new key for gas optimization
        bool isNewKey = !Metadata.hookMetadataKeyExists(
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
