// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

/// @title CommentsV1 - A decentralized commenting system with signature-based authorization
/// @notice This contract allows users to post and manage comments with optional app-signer approval
/// @dev Implements EIP-712 for typed structured data hashing and signing
contract CommentsV1 {
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

    error InvalidAuthor();
    error InvalidAppSignature();
    error InvalidAuthorSignature();
    error InvalidNonce();
    error DeadlineReached();
    error NotAuthorized();

    /// @notice Struct containing all data for a comment
    /// @param content The actual text content of the comment
    /// @param metadata Additional JSON metadata for the comment
    /// @param targetUrl The URL or identifier where the comment is being made
    /// @param parentId The ID of the parent comment if this is a reply, otherwise 0
    /// @param author The address of the comment author
    /// @param appSigner The address of the application signer that authorized this comment
    /// @param deadline Timestamp after which the signatures for this comment become invalid
    /// @param nonce The nonce for the comment
    struct CommentData {
        string content;
        string metadata;
        string targetUrl;
        bytes32 parentId;
        address author;
        address appSigner;
        uint256 nonce;
        uint256 deadline;
    }

    string public constant name = "Comments";
    string public constant version = "1";
    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant COMMENT_TYPEHASH =
        keccak256(
            "CommentData(string content,string metadata,string targetUrl,bytes32 parentId,address author,address appSigner,uint256 nonce,uint256 deadline)"
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

    mapping(address => mapping(address => bool)) public isApproved;
    mapping(address => uint256) public nonces;

    constructor() {
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
    ) external {
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
    ) external {
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
    ) internal {
        if (block.timestamp > commentData.deadline) {
            revert DeadlineReached();
        }

        if (nonces[commentData.author] != commentData.nonce) {
            revert InvalidNonce();
        }

        nonces[commentData.author]++;

        bytes32 commentId = getCommentId(commentData);

        if (
            !SignatureChecker.isValidSignatureNow(
                commentData.appSigner,
                commentId,
                appSignature
            )
        ) {
            revert InvalidAppSignature();
        }

        if (
            msg.sender == commentData.author ||
            isApproved[commentData.author][commentData.appSigner] ||
            SignatureChecker.isValidSignatureNow(
                commentData.author,
                commentId,
                authorSignature
            )
        ) {
            emit CommentAdded(
                commentId,
                commentData.author,
                commentData.appSigner,
                commentData
            );
            return;
        }

        revert NotAuthorized();
    }

    /// @notice Deletes a comment when called by the author directly
    /// @param commentId The unique identifier of the comment to delete
    function deleteCommentAsAuthor(bytes32 commentId) external {
        _deleteComment(commentId, msg.sender);
    }

    /// @notice Deletes a comment with author signature verification
    /// @param commentId The unique identifier of the comment to delete
    /// @param author The address of the comment author
    /// @param authorSignature The signature from the author authorizing deletion (empty if app)
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
            revert DeadlineReached();
        }

        if (nonces[author] != nonce) {
            revert InvalidNonce();
        }

        nonces[author]++;

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

        revert NotAuthorized();
    }

    /// @notice Internal function to handle comment deletion logic
    /// @param commentId The unique identifier of the comment to delete
    /// @param author The address of the comment author
    function _deleteComment(bytes32 commentId, address author) internal {
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
    function _removeApproval(address author, address appSigner) internal {
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
    function removeApprovalAsAuthor(address appSigner) external {
        _removeApproval(msg.sender, appSigner);
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
            revert DeadlineReached();
        }

        if (nonces[author] != nonce) {
            revert InvalidNonce();
        }

        nonces[author]++;

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
            revert DeadlineReached();
        }

        if (nonces[author] != nonce) {
            revert InvalidNonce();
        }

        nonces[author]++;

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

        _removeApproval(author, appSigner);
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
                COMMENT_TYPEHASH,
                keccak256(bytes(commentData.content)),
                keccak256(bytes(commentData.metadata)),
                keccak256(bytes(commentData.targetUrl)),
                commentData.parentId,
                commentData.author,
                commentData.appSigner,
                commentData.nonce,
                commentData.deadline
            )
        );

        return
            keccak256(
                abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
            );
    }
}
