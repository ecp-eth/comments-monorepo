// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @title Comments - Library defining comment-related types
library Comments {
    /// @notice Struct containing all comment data
    /// @param content The actual text content of the comment
    /// @param metadata Additional JSON data that shouldn't be shown to the user as it is
    /// @param targetUri the URI about which the comment is being made
    /// @param commentType The type of the comment (e.g. "question", "answer", "feedback", etc.)
    /// @param author The address of the comment author
    /// @param app The address of the application signer that authorized this comment
    /// @param channelId The channel ID associated with the comment
    /// @param nonce The nonce for the comment
    /// @param deadline Timestamp after which the signatures for this comment become invalid
    /// @param parentId The ID of the parent comment if this is a reply, otherwise bytes32(0)
    /// @param createdAt The timestamp when the comment was created
    /// @param updatedAt The timestamp when the comment was last updated
    struct CommentData {
        // Pack these two addresses together (saves 1 storage slot)
        address author; // 20 bytes
        address app; // 20 bytes
        uint80 createdAt;
        uint80 updatedAt;
        // 32-byte types
        uint256 channelId;
        uint256 nonce;
        uint256 deadline;
        bytes32 parentId;
        // Dynamic types last (conventional pattern)
        string content;
        string metadata;
        string targetUri;
        string commentType;
    }

    /// @notice Struct containing all comment data for creating a comment
    /// @param author The address of the comment author
    /// @param app The address of the application signer that authorized this comment
    /// @param channelId The channel ID associated with the comment
    /// @param nonce The nonce for the comment
    /// @param deadline Timestamp after which the signatures for this comment become invalid
    /// @param parentId The ID of the parent comment if this is a reply, otherwise bytes32(0)
    /// @param content The actual text content of the comment
    /// @param metadata Additional JSON data that shouldn't be shown to the user as it is
    /// @param targetUri the URI about which the comment is being made
    /// @param commentType The type of the comment (e.g. "question", "answer", "feedback", etc.)
    struct CreateCommentData {
        address author;
        address app;
        uint256 channelId;
        uint256 nonce;
        uint256 deadline;
        bytes32 parentId;
        // Dynamic types last (conventional pattern)
        string content;
        string metadata;
        string targetUri;
        string commentType;
    }
}
