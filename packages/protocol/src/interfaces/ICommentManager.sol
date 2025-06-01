// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../libraries/Comments.sol";
import "../libraries/Hooks.sol";
import "./IChannelManager.sol";

/// @title ICommentManager - Interface for the Comments contract
/// @notice This interface defines the functions and events for the Comments contract
interface ICommentManager {
  /// @notice Emitted when a new comment is added
  /// @param commentId Unique identifier of the comment
  /// @param author Address of the comment author
  /// @param app Address of the application signer
  /// @param channelId The channel ID associated with the comment
  /// @param parentId The ID of the parent comment if this is a reply, otherwise bytes32(0)
  /// @param createdAt The timestamp when the comment was created
  /// @param content The text content of the comment - may contain urls, images and mentions
  /// @param metadata Additional JSON data that shouldn't be displayed to the user
  /// @param targetUri the URI about which the comment is being made
  /// @param commentType The type of the comment (e.g. "comment", "like", etc.)
  /// @param hookData Additional data for the comment, added by a hook.
  event CommentAdded(
    bytes32 indexed commentId,
    address indexed author,
    address indexed app,
    uint256 channelId,
    bytes32 parentId,
    uint80 createdAt,
    string content,
    string metadata,
    string targetUri,
    string commentType,
    string hookData
  );

  /// @notice Emitted when a comment is deleted
  /// @param commentId Unique identifier of the deleted comment
  /// @param author Address of the comment author
  event CommentDeleted(bytes32 indexed commentId, address indexed author);

  /// @notice Emitted when a comment is edited
  /// @param commentId Unique identifier of the edited comment
  /// @param editedByApp Address of the app signer that changed the comment
  /// @param author Address of the comment author
  /// @param app Address of the app signer that created the comment
  /// @param channelId The channel ID associated with the comment
  /// @param parentId The ID of the parent comment if this is a reply, otherwise bytes32(0)
  /// @param createdAt The timestamp when the comment was created
  /// @param updatedAt The timestamp when the comment was last updated
  /// @param content The text content of the comment - may contain urls, images and mentions
  /// @param metadata Additional JSON data that shouldn't be displayed to the user
  /// @param targetUri the URI about which the comment is being made
  event CommentEdited(
    bytes32 indexed commentId,
    address indexed editedByApp,
    address indexed author,
    address app,
    uint256 channelId,
    bytes32 parentId,
    uint80 createdAt,
    uint80 updatedAt,
    string content,
    string metadata,
    string targetUri,
    string commentType,
    string hookData
  );

  /// @notice Emitted when a comment's hook data is updated
  /// @param commentId Unique identifier of the comment
  /// @param hookData The new hook data
  event CommentHookDataUpdated(bytes32 indexed commentId, string hookData);

  /// @notice Emitted when an author approves an app signer
  /// @param author Address of the author giving approval
  /// @param app Address being approved
  event ApprovalAdded(address indexed author, address indexed app);

  /// @notice Emitted when an author removes an app signer's approval
  /// @param author Address of the author removing approval
  /// @param app Address being unapproved
  event ApprovalRemoved(address indexed author, address indexed app);

  /// @notice Error thrown when app signature verification fails
  error InvalidAppSignature();
  /// @notice Error thrown when author signature verification fails
  error InvalidAuthorSignature();
  /// @notice Error thrown when nonce is invalid
  error InvalidNonce(
    address author,
    address app,
    uint256 expected,
    uint256 provided
  );
  /// @notice Error thrown when deadline has passed
  error SignatureDeadlineReached(uint256 deadline, uint256 currentTime);
  /// @notice Error thrown when caller is not authorized
  error NotAuthorized(address caller, address requiredCaller);
  /// @notice Error thrown when signature length is invalid
  error InvalidSignatureLength();
  /// @notice Error thrown when signature s value is invalid
  error InvalidSignatureS();
  /// @notice Error thrown when parent comment does not ever existed
  /// @dev It reverts only if the comment has never been created, will not revert if the comment is deleted
  error ParentCommentHasNeverExisted();
  /// @notice Error thrown when both parentId and targetUri are set
  error InvalidCommentReference(string message);
  /// @notice Error thrown when address is zero
  error ZeroAddress();
  /// @notice Error thrown when comment does not exist
  error CommentDoesNotExist();

  /// @notice Posts a comment directly from the author's address
  /// @param commentData The comment data struct containing content and metadata
  /// @param appSignature Signature from the app signer authorizing the comment
  function postComment(
    Comments.CreateComment calldata commentData,
    bytes calldata appSignature
  ) external payable;

  /// @notice Posts a comment with both author and app signer signatures
  /// @param commentData The comment data struct containing content and metadata
  /// @param authorSignature Signature from the author authorizing the comment
  /// @param appSignature Signature from the app signer authorizing the comment
  function postCommentWithSig(
    Comments.CreateComment calldata commentData,
    bytes calldata authorSignature,
    bytes calldata appSignature
  ) external payable;

  /// @notice Deletes a comment when called by the author directly
  /// @param commentId The unique identifier of the comment to delete
  function deleteComment(bytes32 commentId) external;

  /// @notice Deletes a comment with author signature verification
  /// @param commentId The unique identifier of the comment to delete
  /// @param app The address of the app signer
  /// @param deadline Timestamp after which the signature becomes invalid
  /// @param authorSignature The signature from the author authorizing deletion (empty if app)
  /// @param appSignature The signature from the app signer authorizing deletion (empty if author)
  function deleteCommentWithSig(
    bytes32 commentId,
    address app,
    uint256 deadline,
    bytes calldata authorSignature,
    bytes calldata appSignature
  ) external;

  /// @notice Edits a comment when called by the author directly
  /// @param commentId The unique identifier of the comment to edit
  /// @param editData The comment data struct containing content and metadata
  /// @param appSignature The signature from the app signer authorizing the edit
  function editComment(
    bytes32 commentId,
    Comments.EditComment calldata editData,
    bytes calldata appSignature
  ) external payable;

  /// @notice Edits a comment with both author and app signer signatures
  /// @param commentId The unique identifier of the comment to edit
  /// @param editData The comment data struct containing content and metadata
  /// @param authorSignature The signature from the author authorizing the edit (empty if app)
  /// @param appSignature The signature from the app signer authorizing the edit (empty if author)
  function editCommentWithSig(
    bytes32 commentId,
    Comments.EditComment calldata editData,
    bytes calldata authorSignature,
    bytes calldata appSignature
  ) external payable;

  /// @notice Approves an app signer when called directly by the author
  /// @param app The address to approve
  function addApproval(address app) external;

  /// @notice Removes an app signer approval when called directly by the author
  /// @param app The address to remove approval from
  function revokeApproval(address app) external;

  /// @notice Approves an app signer with signature verification
  /// @param author The address granting approval
  /// @param app The address being approved
  /// @param nonce The current nonce for the author
  /// @param deadline Timestamp after which the signature becomes invalid
  /// @param signature The author's signature authorizing the approval
  function addApprovalWithSig(
    address author,
    address app,
    uint256 nonce,
    uint256 deadline,
    bytes calldata signature
  ) external;

  /// @notice Removes an app signer approval with signature verification
  /// @param author The address removing approval
  /// @param app The address being unapproved
  /// @param nonce The current nonce for the author
  /// @param deadline Timestamp after which the signature becomes invalid
  /// @param signature The author's signature authorizing the removal
  function removeApprovalWithSig(
    address author,
    address app,
    uint256 nonce,
    uint256 deadline,
    bytes calldata signature
  ) external;

  /// @notice Calculates the EIP-712 hash for a permit
  /// @param author Address of the author
  /// @param app Address of the app signer
  /// @param nonce Current nonce for the author
  /// @param deadline Timestamp after which the signature is invalid
  /// @return bytes32 The computed hash
  function getAddApprovalHash(
    address author,
    address app,
    uint256 nonce,
    uint256 deadline
  ) external view returns (bytes32);

  /// @notice Calculates the EIP-712 hash for removing an approval
  /// @param author The address removing approval
  /// @param app The address being unapproved
  /// @param nonce The current nonce for the author
  /// @param deadline Timestamp after which the signature becomes invalid
  /// @return The computed hash
  function getRemoveApprovalHash(
    address author,
    address app,
    uint256 nonce,
    uint256 deadline
  ) external view returns (bytes32);

  /// @notice Calculates the EIP-712 hash for deleting a comment
  /// @param commentId The unique identifier of the comment to delete
  /// @param author The address of the comment author
  /// @param app The address of the app signer
  /// @param deadline Timestamp after which the signature becomes invalid
  /// @return The computed hash
  function getDeleteCommentHash(
    bytes32 commentId,
    address author,
    address app,
    uint256 deadline
  ) external view returns (bytes32);

  /// @notice Calculates the EIP-712 hash for editing a comment
  /// @param commentId The unique identifier of the comment to edit
  /// @param author The address of the comment author
  /// @param editData The comment data struct containing content and metadata
  /// @return The computed hash
  function getEditCommentHash(
    bytes32 commentId,
    address author,
    Comments.EditComment calldata editData
  ) external view returns (bytes32);

  /// @notice Calculates the EIP-712 hash for a comment
  /// @param commentData The comment data struct to hash
  /// @return bytes32 The computed hash
  function getCommentId(
    Comments.CreateComment memory commentData
  ) external view returns (bytes32);

  /// @notice Updates the channel manager contract address (only owner)
  /// @param _channelContract The new channel manager contract address
  function updateChannelContract(address _channelContract) external;

  /// @notice Get a comment by its ID
  /// @param commentId The ID of the comment to get
  /// @return The comment data
  function getComment(
    bytes32 commentId
  ) external view returns (Comments.Comment memory);

  /// @notice Get the approval status for an author and app
  /// @param author The address of the author
  /// @param app The address of the app
  /// @return The approval status
  function isApproved(address author, address app) external view returns (bool);

  /// @notice Get the nonce for an author and app
  /// @param author The address of the author
  /// @param app The address of the app
  /// @return The nonce
  function getNonce(
    address author,
    address app
  ) external view returns (uint256);

  /// @notice Get the deleted status for a comment
  /// @param commentId The ID of the comment
  /// @return The deleted status
  function isDeleted(bytes32 commentId) external view returns (bool);
}
