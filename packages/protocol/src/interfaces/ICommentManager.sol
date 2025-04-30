// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../libraries/Comments.sol";
import "../libraries/Hooks.sol";

/// @title ICommentManager - Interface for the Comments contract
/// @notice This interface defines the functions and events for the Comments contract
interface ICommentManager {
    /// @notice Emitted when a new comment is added
    /// @param commentId Unique identifier of the comment
    /// @param author Address of the comment author
    /// @param appSigner Address of the application signer
    /// @param commentData Struct containing all comment data
    event CommentAdded(
        bytes32 indexed commentId,
        address indexed author,
        address indexed appSigner,
        Comments.CommentData commentData
    );

    /// @notice Emitted when a comment is deleted
    /// @param commentId Unique identifier of the deleted comment
    /// @param author Address of the comment author
    event CommentDeleted(bytes32 indexed commentId, address indexed author);

    /// @notice Emitted when an author approves an app signer
    /// @param author Address of the author giving approval
    /// @param appSigner Address being approved
    event ApprovalAdded(address indexed author, address indexed appSigner);

    /// @notice Emitted when an author removes an app signer's approval
    /// @param author Address of the author removing approval
    /// @param appSigner Address being unapproved
    event ApprovalRemoved(address indexed author, address indexed appSigner);

    /// @notice Error thrown when author address is invalid
    error InvalidAuthorAddress();
    /// @notice Error thrown when app signature verification fails
    error InvalidAppSignature();
    /// @notice Error thrown when author signature verification fails
    error InvalidAuthorSignature();
    /// @notice Error thrown when nonce is invalid
    error InvalidNonce(
        address author,
        address appSigner,
        uint256 expected,
        uint256 provided
    );
    /// @notice Error thrown when deadline has passed
    error SignatureDeadlineReached(uint256 deadline, uint256 currentTime);
    /// @notice Error thrown when caller is not authorized
    error NotAuthorized(address caller, address requiredCaller);
    /// @notice Error thrown when channel does not exist
    error ChannelDoesNotExist();
    /// @notice Error thrown when channel hook execution fails
    error ChannelHookExecutionFailed(Hooks.HookPhase hookPhase);
    /// @notice Error thrown when signature length is invalid
    error InvalidSignatureLength();
    /// @notice Error thrown when signature s value is invalid
    error InvalidSignatureS();
    /// @notice Error thrown when parent comment does not exist
    error ParentCommentDoesNotExist();
    /// @notice Error thrown when both parentId and targetUri are set
    error InvalidCommentReference(string message);
    /// @notice Error thrown when address is zero
    error ZeroAddress();

    /// @notice Posts a comment directly from the author's address
    /// @param commentData The comment data struct containing content and metadata
    /// @param appSignature Signature from the app signer authorizing the comment
    function postCommentAsAuthor(
        Comments.CommentData calldata commentData,
        bytes calldata appSignature
    ) external payable;

    /// @notice Posts a comment with both author and app signer signatures
    /// @param commentData The comment data struct containing content and metadata
    /// @param authorSignature Signature from the author authorizing the comment
    /// @param appSignature Signature from the app signer authorizing the comment
    function postComment(
        Comments.CommentData calldata commentData,
        bytes calldata authorSignature,
        bytes calldata appSignature
    ) external payable;

    /// @notice Deletes a comment when called by the author directly
    /// @param commentId The unique identifier of the comment to delete
    function deleteCommentAsAuthor(bytes32 commentId) external;

    /// @notice Deletes a comment with author signature verification
    /// @param commentId The unique identifier of the comment to delete
    /// @param author The address of the comment author
    /// @param appSigner The address of the app signer
    /// @param nonce The current nonce for the author
    /// @param deadline Timestamp after which the signature becomes invalid
    /// @param authorSignature The signature from the author authorizing deletion (empty if app)
    /// @param appSignature The signature from the app signer authorizing deletion (empty if author)
    function deleteComment(
        bytes32 commentId,
        address author,
        address appSigner,
        uint256 nonce,
        uint256 deadline,
        bytes calldata authorSignature,
        bytes calldata appSignature
    ) external;

    /// @notice Approves an app signer when called directly by the author
    /// @param appSigner The address to approve
    function addApprovalAsAuthor(address appSigner) external;

    /// @notice Removes an app signer approval when called directly by the author
    /// @param appSigner The address to remove approval from
    function revokeApprovalAsAuthor(address appSigner) external;

    /// @notice Approves an app signer with signature verification
    /// @param author The address granting approval
    /// @param appSigner The address being approved
    /// @param nonce The current nonce for the author
    /// @param deadline Timestamp after which the signature becomes invalid
    /// @param signature The author's signature authorizing the approval
    function addApproval(
        address author,
        address appSigner,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external;

    /// @notice Removes an app signer approval with signature verification
    /// @param author The address removing approval
    /// @param appSigner The address being unapproved
    /// @param nonce The current nonce for the author
    /// @param deadline Timestamp after which the signature becomes invalid
    /// @param signature The author's signature authorizing the removal
    function removeApproval(
        address author,
        address appSigner,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external;

    /// @notice Calculates the EIP-712 hash for a permit
    /// @param author Address of the author
    /// @param appSigner Address of the app signer
    /// @param nonce Current nonce for the author
    /// @param deadline Timestamp after which the signature is invalid
    /// @return bytes32 The computed hash
    function getAddApprovalHash(
        address author,
        address appSigner,
        uint256 nonce,
        uint256 deadline
    ) external view returns (bytes32);

    /// @notice Calculates the EIP-712 hash for removing an approval
    /// @param author The address removing approval
    /// @param appSigner The address being unapproved
    /// @param nonce The current nonce for the author
    /// @param deadline Timestamp after which the signature becomes invalid
    /// @return The computed hash
    function getRemoveApprovalHash(
        address author,
        address appSigner,
        uint256 nonce,
        uint256 deadline
    ) external view returns (bytes32);

    /// @notice Calculates the EIP-712 hash for deleting a comment
    /// @param commentId The unique identifier of the comment to delete
    /// @param author The address of the comment author
    /// @param appSigner The address of the app signer
    /// @param nonce The current nonce for the author
    /// @param deadline Timestamp after which the signature becomes invalid
    /// @return The computed hash
    function getDeleteCommentHash(
        bytes32 commentId,
        address author,
        address appSigner,
        uint256 nonce,
        uint256 deadline
    ) external view returns (bytes32);

    /// @notice Calculates the EIP-712 hash for a comment
    /// @param commentData The comment data struct to hash
    /// @return bytes32 The computed hash
    function getCommentId(
        Comments.CommentData memory commentData
    ) external view returns (bytes32);

    /// @notice Get comment data by ID
    /// @param commentId The comment ID to query
    /// @return The comment data struct
    function getComment(
        bytes32 commentId
    ) external view returns (Comments.CommentData memory);

    /// @notice Updates the channel manager contract address (only owner)
    /// @param _channelContract The new channel manager contract address
    function updateChannelContract(address _channelContract) external;
}
