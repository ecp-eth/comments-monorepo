// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Comments - Library defining comment-related types
library Comments {
  /// @notice Comment type constants
  /// @dev Type 0: Standard comment
  /// @dev Type 1: Reaction (with reaction type in content field, e.g. "like", "dislike", "heart")
  /// more types can be added in the future, please check the docs for more information.
  uint8 public constant COMMENT_TYPE_COMMENT = 0;
  uint8 public constant COMMENT_TYPE_REACTION = 1;

  /// @notice Struct containing metadata key-value pair
  /// @param key UTF-8 encoded string of format "type key". Must fit in 32 bytes.
  /// @param value The metadata value as bytes
  struct MetadataEntry {
    bytes32 key;
    bytes value;
  }

  /// @notice Struct containing all comment data
  /// @param author The address of the comment author
  /// @param createdAt The timestamp when the comment was created
  /// @param app The address of the application signer that authorized this comment
  /// @param updatedAt The timestamp when the comment was last updated
  /// @param commentType The type of the comment (0=comment, 1=reaction)
  /// @param channelId The channel ID associated with the comment
  /// @param parentId The ID of the parent comment if this is a reply, otherwise bytes32(0)
  /// @param content The text content of the comment - may contain urls, images and mentions
  /// @param targetUri the URI about which the comment is being made
  struct Comment {
    // Pack these fields together (saves 1 storage slot)
    address author; // 20 bytes   --┬-- 32 bytes
    uint96 createdAt; // 12 bytes --┘
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
    MetadataEntry[] metadata;
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
    MetadataEntry[] metadata;
  }
}
