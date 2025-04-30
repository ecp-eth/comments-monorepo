// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IHook.sol";
import "./interfaces/ICommentTypes.sol";
import "./interfaces/IChannelManager.sol";
import "./ChannelManager.sol";

/// @title CommentsV1 - A decentralized comments system
/// @notice This contract allows users to post and manage comments with optional app-signer approval and channel-specific hooks
/// @dev Implements EIP-712 for typed structured data hashing and signing
/// @dev Security Model:
/// 1. Authentication:
///    - Comments can be posted directly by authors or via signatures
///    - App signers must be approved by authors
///    - All signatures follow EIP-712 for better security
/// 2. Authorization:
///    - Only comment authors can delete their comments
///    - App signer approvals can be revoked at any time
///    - Nonce system prevents signature replay attacks
/// 3. Hook System:
///    - Protected against reentrancy
///    - Channel-specific hooks are executed before and after comment operations
///    - Channel owners control their hooks
/// 4. Data Integrity:
///    - Thread IDs are immutable once set
///    - Parent-child relationships are verified
///    - Comment IDs are cryptographically secure
contract CommentsV1 is ICommentTypes, ReentrancyGuard, Pausable, Ownable {
    /// @notice Emitted when a new comment is added
    /// @param commentId Unique identifier of the comment
    /// @param author Address of the comment author
    /// @param appSigner Address of the application signer
    /// @param commentData Struct containing all comment data
    event CommentAdded(
        bytes32 indexed commentId,
        address indexed author,
        address indexed appSigner,
        CommentData commentData
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
    error ChannelHookExecutionFailed(IChannelManager.HookPhase hookPhase);
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

    string public constant name = "Comments";
    string public constant version = "1";
    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant ADD_COMMENT_TYPEHASH =
        keccak256(
            "AddComment(string content,string metadata,string targetUri,string commentType,address author,address appSigner,uint256 channelId,uint256 nonce,uint256 deadline,bytes32 parentId)"
        );
    bytes32 public constant DELETE_COMMENT_TYPEHASH =
        keccak256(
            "DeleteComment(bytes32 commentId,address author,address appSigner,uint256 nonce,uint256 deadline)"
        );
    bytes32 public constant ADD_APPROVAL_TYPEHASH =
        keccak256(
            "AddApproval(address author,address appSigner,uint256 nonce,uint256 deadline)"
        );
    bytes32 public constant REMOVE_APPROVAL_TYPEHASH =
        keccak256(
            "RemoveApproval(address author,address appSigner,uint256 nonce,uint256 deadline)"
        );

    // On-chain storage mappings
    mapping(bytes32 => CommentData) public comments;
    mapping(address => mapping(address => bool)) public isApproved;
    mapping(address => mapping(address => uint256)) public nonces;
    mapping(bytes32 => bool) public deleted;

    // Channel manager reference
    IChannelManager public channelManager;

    /// @notice Constructor initializes the contract with the deployer as owner and channel manager
    /// @dev Sets up EIP-712 domain separator
    /// @param initialOwner The address that will own the contract
    constructor(address initialOwner) Ownable(initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes(name)),
                keccak256(bytes(version)),
                block.chainid,
                address(this)
            )
        );
    }

    /// @notice Posts a comment directly from the author's address
    /// @param commentData The comment data struct containing content and metadata
    /// @param appSignature Signature from the app signer authorizing the comment
    function postCommentAsAuthor(
        CommentData calldata commentData,
        bytes calldata appSignature
    ) external payable {
        _postComment(commentData, bytes(""), appSignature);
    }

    /// @notice Posts a comment with both author and app signer signatures
    /// @param commentData The comment data struct containing content and metadata
    /// @param authorSignature Signature from the author authorizing the comment
    /// @param appSignature Signature from the app signer authorizing the comment
    function postComment(
        CommentData calldata commentData,
        bytes calldata authorSignature,
        bytes calldata appSignature
    ) external payable {
        _postComment(commentData, authorSignature, appSignature);
    }

    /// @notice Internal function to handle comment posting logic
    /// @param commentData The comment data struct containing content and metadata
    /// @param authorSignature Signature from the author (empty if called via postCommentAsAuthor)
    /// @param appSignature Signature from the app signer
    function _postComment(
        CommentData calldata commentData,
        bytes memory authorSignature,
        bytes memory appSignature
    ) internal nonReentrant {
        // Validate submitted within deadline
        if (block.timestamp > commentData.deadline) {
            revert SignatureDeadlineReached(
                commentData.deadline,
                block.timestamp
            );
        }

        // Validate parentId and targetUri
        if (commentData.parentId != bytes32(0)) {
            if (
                comments[commentData.parentId].author == address(0) &&
                !deleted[commentData.parentId]
            ) {
                revert ParentCommentDoesNotExist();
            }
            if (bytes(commentData.targetUri).length > 0) {
                revert InvalidCommentReference(
                    "Parent comment and targetUri cannot both be set"
                );
            }
        }

        // Validate nonce
        if (
            nonces[commentData.author][commentData.appSigner] !=
            commentData.nonce
        ) {
            revert InvalidNonce(
                commentData.author,
                commentData.appSigner,
                nonces[commentData.author][commentData.appSigner],
                commentData.nonce
            );
        }

        // Validate channel exists
        if (!channelManager.channelExists(commentData.channelId)) {
            revert ChannelDoesNotExist();
        }

        nonces[commentData.author][commentData.appSigner]++;

        bytes32 commentId = getCommentId(commentData);

        // Validate signatures if present
        if (appSignature.length > 0) {
            _validateSignature(appSignature);
            if (
                !SignatureChecker.isValidSignatureNow(
                    commentData.appSigner,
                    commentId,
                    appSignature
                )
            ) {
                revert InvalidAppSignature();
            }
        }

        if (authorSignature.length > 0) {
            _validateSignature(authorSignature);
        }

        if (
            msg.sender == commentData.author ||
            isApproved[commentData.author][commentData.appSigner] ||
            (authorSignature.length > 0 &&
                SignatureChecker.isValidSignatureNow(
                    commentData.author,
                    commentId,
                    authorSignature
                ))
        ) {
            // Execute channel-specific hooks before comment
            bool hookSuccess = channelManager.executeHooks{value: msg.value}(
                commentData.channelId,
                commentData,
                msg.sender,
                commentId,
                IChannelManager.HookPhase.Before
            );
            if (!hookSuccess)
                revert ChannelHookExecutionFailed(
                    IChannelManager.HookPhase.Before
                );

            // Store comment data on-chain
            comments[commentId] = commentData;

            // Execute channel-specific hooks after comment
            hookSuccess = channelManager.executeHooks(
                commentData.channelId,
                commentData,
                msg.sender,
                commentId,
                IChannelManager.HookPhase.After
            );
            if (!hookSuccess)
                revert ChannelHookExecutionFailed(
                    IChannelManager.HookPhase.After
                );

            emit CommentAdded(
                commentId,
                commentData.author,
                commentData.appSigner,
                commentData
            );
            return;
        }

        revert NotAuthorized(msg.sender, commentData.author);
    }

    /// @notice Deletes a comment when called by the author directly
    /// @param commentId The unique identifier of the comment to delete
    function deleteCommentAsAuthor(bytes32 commentId) external {
        CommentData storage comment = comments[commentId];
        require(comment.author != address(0), "Comment does not exist");
        require(comment.author == msg.sender, "Not comment author");
        _deleteComment(commentId, msg.sender);
    }

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
    ) external {
        if (block.timestamp > deadline) {
            revert SignatureDeadlineReached(deadline, block.timestamp);
        }

        if (nonces[author][appSigner] != nonce) {
            revert InvalidNonce(
                author,
                appSigner,
                nonces[author][appSigner],
                nonce
            );
        }

        CommentData storage comment = comments[commentId];
        require(comment.author != address(0), "Comment does not exist");

        nonces[author][appSigner]++;

        bytes32 deleteHash = getDeleteCommentHash(
            commentId,
            author,
            appSigner,
            nonce,
            deadline
        );

        if (
            isApproved[author][appSigner] &&
            SignatureChecker.isValidSignatureNow(
                appSigner,
                deleteHash,
                appSignature
            )
        ) {
            _deleteComment(commentId, author);
            return;
        } else if (
            SignatureChecker.isValidSignatureNow(
                author,
                deleteHash,
                authorSignature
            )
        ) {
            _deleteComment(commentId, author);
            return;
        }

        revert NotAuthorized(msg.sender, author);
    }

    /// @notice Internal function to handle comment deletion logic
    /// @param commentId The unique identifier of the comment to delete
    /// @param author The address of the comment author
    function _deleteComment(bytes32 commentId, address author) internal {
        delete comments[commentId];
        deleted[commentId] = true;
        emit CommentDeleted(commentId, author);
    }

    /// @notice Internal function to add an app signer approval
    /// @param author The address granting approval
    /// @param appSigner The address being approved
    function _addApproval(address author, address appSigner) internal {
        isApproved[author][appSigner] = true;
        emit ApprovalAdded(author, appSigner);
    }

    /// @notice Internal function to remove an app signer approval
    /// @param author The address removing approval
    /// @param appSigner The address being unapproved
    function _revokeApproval(address author, address appSigner) internal {
        isApproved[author][appSigner] = false;
        emit ApprovalRemoved(author, appSigner);
    }

    /// @notice Approves an app signer when called directly by the author
    /// @param appSigner The address to approve
    function addApprovalAsAuthor(address appSigner) external {
        _addApproval(msg.sender, appSigner);
    }

    /// @notice Removes an app signer approval when called directly by the author
    /// @param appSigner The address to remove approval from
    function revokeApprovalAsAuthor(address appSigner) external {
        _revokeApproval(msg.sender, appSigner);
    }

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
    ) external {
        if (block.timestamp > deadline) {
            revert SignatureDeadlineReached(deadline, block.timestamp);
        }

        if (nonces[author][appSigner] != nonce) {
            revert InvalidNonce(
                author,
                appSigner,
                nonces[author][appSigner],
                nonce
            );
        }

        nonces[author][appSigner]++;

        bytes32 addApprovalHash = getAddApprovalHash(
            author,
            appSigner,
            nonce,
            deadline
        );

        if (
            !SignatureChecker.isValidSignatureNow(
                author,
                addApprovalHash,
                signature
            )
        ) {
            revert InvalidAuthorSignature();
        }

        _addApproval(author, appSigner);
    }

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
    ) external {
        if (block.timestamp > deadline) {
            revert SignatureDeadlineReached(deadline, block.timestamp);
        }

        if (nonces[author][appSigner] != nonce) {
            revert InvalidNonce(
                author,
                appSigner,
                nonces[author][appSigner],
                nonce
            );
        }

        nonces[author][appSigner]++;

        bytes32 removeApprovalHash = getRemoveApprovalHash(
            author,
            appSigner,
            nonce,
            deadline
        );

        if (
            !SignatureChecker.isValidSignatureNow(
                author,
                removeApprovalHash,
                signature
            )
        ) {
            revert InvalidAuthorSignature();
        }

        _revokeApproval(author, appSigner);
    }

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
    ) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                ADD_APPROVAL_TYPEHASH,
                author,
                appSigner,
                nonce,
                deadline
            )
        );

        return
            keccak256(
                abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
            );
    }

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
    ) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                REMOVE_APPROVAL_TYPEHASH,
                author,
                appSigner,
                nonce,
                deadline
            )
        );

        return
            keccak256(
                abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
            );
    }

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
    ) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                DELETE_COMMENT_TYPEHASH,
                commentId,
                author,
                appSigner,
                nonce,
                deadline
            )
        );

        return
            keccak256(
                abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
            );
    }

    /// @notice Calculates the EIP-712 hash for a comment
    /// @param commentData The comment data struct to hash
    /// @return bytes32 The computed hash
    function getCommentId(
        CommentData memory commentData
    ) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                ADD_COMMENT_TYPEHASH,
                keccak256(bytes(commentData.content)),
                keccak256(bytes(commentData.metadata)),
                keccak256(bytes(commentData.targetUri)),
                keccak256(bytes(commentData.commentType)),
                commentData.author,
                commentData.appSigner,
                commentData.channelId,
                commentData.nonce,
                commentData.deadline,
                commentData.parentId
            )
        );

        return
            keccak256(
                abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
            );
    }

    /// @notice Get comment data by ID
    /// @param commentId The comment ID to query
    /// @return The comment data struct
    function getComment(
        bytes32 commentId
    ) external view returns (CommentData memory) {
        CommentData storage comment = comments[commentId];
        require(comment.author != address(0), "Comment does not exist");
        return comment;
    }

    /// @notice Updates the channel manager contract address (only owner)
    /// @param _channelContract The new channel manager contract address
    function updateChannelContract(
        address _channelContract
    ) external onlyOwner {
        if (_channelContract == address(0)) revert ZeroAddress();
        channelManager = ChannelManager(payable(_channelContract));
    }

    /// @notice Validates a signature against malleability
    /// @dev Ensures signature follows EIP-2098 and has valid s value
    /// @param signature The signature to validate
    function _validateSignature(bytes memory signature) internal pure {
        if (signature.length != 65) revert InvalidSignatureLength();

        // Extract s value from signature
        uint256 s;
        assembly {
            s := mload(add(signature, 0x40))
        }

        // Ensure s is in lower half of curve's order
        if (
            s >
            0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0
        ) {
            revert InvalidSignatureS();
        }
    }
}
