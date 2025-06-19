// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Metadata.sol";

/// @title Comments - Type definitions for comment-related structs and enums
library Comments {
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
    AuthorAuthMethod authMethod; // 1 byte --┘
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
}
