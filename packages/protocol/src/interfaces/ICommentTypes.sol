// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @title ICommentTypes - Interface defining comment-related types
interface ICommentTypes {
    /// @notice Struct containing all comment data
    /// @param content The actual text content of the comment
    /// @param metadata Additional JSON metadata for the comment
    /// @param targetUri the URI about which the comment is being made, for replies uses CAIP-10 format: eip155:${chainId}/${contractAddress}/${commentId}
    /// @param author The address of the comment author
    /// @param appSigner The address of the application signer that authorized this comment
    /// @param deadline Timestamp after which the signatures for this comment become invalid
    /// @param nonce The nonce for the comment
    /// @param forumId The forum ID associated with the comment
    /// @param commentType The type of the comment (e.g. "question", "answer", "feedback", etc.)
    struct CommentData {
        string content;
        string metadata;
        string targetUri;
        string commentType;
        address author;
        address appSigner;
        uint256 channelId;
        uint256 nonce;
        uint256 deadline;
    }
} 