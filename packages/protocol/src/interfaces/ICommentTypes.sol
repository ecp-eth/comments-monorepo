// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICommentTypes {
    /// @notice Struct containing all data for a comment
    /// @param content The actual text content of the comment
    /// @param metadata Additional JSON metadata for the comment
    /// @param targetUri the URI about which the comment is being made
    /// @param parentId The ID of the parent comment if this is a reply, otherwise bytes32(0)
    /// @param threadId The ID of the thread this comment belongs to
    /// @param author The address of the comment author
    /// @param appSigner The address of the application signer that authorized this comment
    /// @param deadline Timestamp after which the signatures for this comment become invalid
    /// @param nonce The nonce for the comment
    struct CommentData {
        string content;
        string metadata;
        string targetUri;
        bytes32 parentId;
        bytes32 threadId;
        address author;
        address appSigner;
        uint256 nonce;
        uint256 deadline;
    }
} 