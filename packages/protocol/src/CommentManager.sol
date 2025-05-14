// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./libraries/Comments.sol";
import "./interfaces/ICommentManager.sol";
import "./ChannelManager.sol";
import "./libraries/Channels.sol";

/// @title CommentManager - A decentralized comments system
/// @notice This contract allows users to post and manage comments with optional app-signer approval and channel-specific hooks
/// @dev Implements EIP-712 for typed structured data hashing and signing
contract CommentManager is ICommentManager, ReentrancyGuard, Pausable, Ownable {
    string public constant name = "Comments";
    string public constant version = "1";
    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant ADD_COMMENT_TYPEHASH =
        keccak256(
            "AddComment(string content,string metadata,string targetUri,string commentType,address author,address app,uint256 channelId,uint256 nonce,uint256 deadline,bytes32 parentId)"
        );
    bytes32 public constant DELETE_COMMENT_TYPEHASH =
        keccak256(
            "DeleteComment(bytes32 commentId,address author,address app,uint256 nonce,uint256 deadline)"
        );
    bytes32 public constant EDIT_COMMENT_TYPEHASH =
        keccak256(
            "EditComment(bytes32 commentId,string content,string metadata,address app,uint256 nonce,uint256 deadline)"
        );
    bytes32 public constant ADD_APPROVAL_TYPEHASH =
        keccak256(
            "AddApproval(address author,address app,uint256 nonce,uint256 deadline)"
        );
    bytes32 public constant REMOVE_APPROVAL_TYPEHASH =
        keccak256(
            "RemoveApproval(address author,address app,uint256 nonce,uint256 deadline)"
        );

    // On-chain storage mappings
    mapping(bytes32 => Comments.Comment) internal comments;
    /// @notice Mapping of author to app to approval status
    mapping(address => mapping(address => bool)) internal approvals;
    /// @notice Mapping of author to app to nonce
    mapping(address => mapping(address => uint256)) internal nonces;
    /// @notice Mapping of comment ID to deleted status, if missing in mapping, the comment is not deleted
    mapping(bytes32 => bool) internal deleted;

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

    /// @inheritdoc ICommentManager
    function postCommentAsAuthor(
        Comments.CreateComment calldata commentData,
        bytes calldata appSignature
    ) external payable {
        _postComment(commentData, bytes(""), appSignature);
    }

    /// @inheritdoc ICommentManager
    function postComment(
        Comments.CreateComment calldata commentData,
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
        Comments.CreateComment calldata commentData,
        bytes memory authorSignature,
        bytes memory appSignature
    ) internal {
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
        if (nonces[commentData.author][commentData.app] != commentData.nonce) {
            revert InvalidNonce(
                commentData.author,
                commentData.app,
                nonces[commentData.author][commentData.app],
                commentData.nonce
            );
        }

        // Validate channel exists
        if (!channelManager.channelExists(commentData.channelId)) {
            revert IChannelManager.ChannelDoesNotExist();
        }

        nonces[commentData.author][commentData.app]++;

        bytes32 commentId = getCommentId(commentData);

        // always validate app signature
        if (
            commentData.app != msg.sender &&
            !SignatureChecker.isValidSignatureNow(
                commentData.app,
                commentId,
                appSignature
            )
        ) {
            revert InvalidAppSignature();
        }

        if (
            msg.sender == commentData.author ||
            approvals[commentData.author][commentData.app] ||
            (authorSignature.length > 0 &&
                SignatureChecker.isValidSignatureNow(
                    commentData.author,
                    commentId,
                    authorSignature
                ))
        ) {
            Comments.Comment memory comment = Comments.Comment({
                author: commentData.author,
                app: commentData.app,
                channelId: commentData.channelId,
                parentId: commentData.parentId,
                content: commentData.content,
                metadata: commentData.metadata,
                targetUri: commentData.targetUri,
                commentType: commentData.commentType,
                createdAt: uint80(block.timestamp),
                updatedAt: uint80(block.timestamp),
                nonce: commentData.nonce,
                deadline: commentData.deadline,
                hookData: ""
            });
            // Store comment data on-chain
            comments[commentId] = comment;

            Channels.Channel memory channel = channelManager.getChannel(
                commentData.channelId
            );
            address hookAddress = address(channel.hook);

            if (hookAddress != address(0) && channel.permissions.afterComment) {
                // Calculate hook value after protocol fee
                uint256 msgValueAfterFee = channelManager
                    .deductProtocolHookTransactionFee(msg.value);

                string memory commentHookData = channel.hook.afterComment{
                    value: msgValueAfterFee
                }(comment, msg.sender, commentId);

                Comments.Comment storage storedComment = comments[commentId];
                storedComment.hookData = commentHookData;
            }

            emit CommentAdded(commentId, comment.author, comment.app, comment);

            return;
        }

        revert NotAuthorized(msg.sender, commentData.author);
    }

    /// @inheritdoc ICommentManager
    function editCommentAsAuthor(
        bytes32 commentId,
        Comments.EditCommentData calldata editData,
        bytes calldata appSignature
    ) external {
        _editComment(commentId, editData, bytes(""), appSignature);
    }

    /// @inheritdoc ICommentManager
    function editComment(
        bytes32 commentId,
        Comments.EditCommentData calldata editData,
        bytes calldata authorSignature,
        bytes calldata appSignature
    ) external {
        _editComment(commentId, editData, authorSignature, appSignature);
    }

    /// @notice Internal function to handle comment editing logic
    /// @param commentId The unique identifier of the comment to edit
    /// @param editData The comment data struct containing content and metadata
    /// @param authorSignature Signature from the author (empty if called via editCommentAsAuthor)
    /// @param appSignature Signature from the app signer
    function _editComment(
        bytes32 commentId,
        Comments.EditCommentData calldata editData,
        bytes memory authorSignature,
        bytes memory appSignature
    ) internal {
        if (block.timestamp > editData.deadline) {
            revert SignatureDeadlineReached(editData.deadline, block.timestamp);
        }

        Comments.Comment storage comment = comments[commentId];

        require(comment.author != address(0), "Comment does not exist");

        // Validate nonce
        if (nonces[comment.author][editData.app] != editData.nonce) {
            revert InvalidNonce(
                comment.author,
                editData.app,
                nonces[comment.author][editData.app],
                editData.nonce
            );
        }

        nonces[comment.author][editData.app]++;

        bytes32 editHash = getEditCommentHash(commentId, editData);

        // Validate signatures if present
        if (appSignature.length > 0) {
            if (
                !SignatureChecker.isValidSignatureNow(
                    // @QUESTION do we want to allow any app to edit a comment?
                    editData.app,
                    editHash,
                    appSignature
                )
            ) {
                revert InvalidAppSignature();
            }
        }

        if (
            msg.sender != comment.author &&
            !approvals[comment.author][editData.app] &&
            !(authorSignature.length > 0 &&
                SignatureChecker.isValidSignatureNow(
                    comment.author,
                    editHash,
                    authorSignature
                ))
        ) {
            revert NotAuthorized(msg.sender, comment.author);
        }

        // @QUESTION do we want to update also app?
        comment.content = editData.content;
        comment.metadata = editData.metadata;
        comment.updatedAt = uint80(block.timestamp);

        emit CommentEdited(commentId, comment.author, editData.app, comment);
    }

    /// @inheritdoc ICommentManager
    function deleteCommentAsAuthor(bytes32 commentId) external {
        Comments.Comment storage comment = comments[commentId];
        require(comment.author != address(0), "Comment does not exist");
        require(comment.author == msg.sender, "Not comment author");
        _deleteComment(commentId, msg.sender);
    }

    /// @inheritdoc ICommentManager
    function deleteComment(
        bytes32 commentId,
        address author,
        address app,
        uint256 nonce,
        uint256 deadline,
        bytes calldata authorSignature,
        bytes calldata appSignature
    ) external {
        if (block.timestamp > deadline) {
            revert SignatureDeadlineReached(deadline, block.timestamp);
        }

        if (nonces[author][app] != nonce) {
            revert InvalidNonce(author, app, nonces[author][app], nonce);
        }

        Comments.Comment storage comment = comments[commentId];
        require(comment.author != address(0), "Comment does not exist");
        require(
            comment.author == author,
            "Author does not match comment author"
        );
        nonces[author][app]++;

        bytes32 deleteHash = getDeleteCommentHash(
            commentId,
            author,
            app,
            nonce,
            deadline
        );

        if (
            approvals[author][app] &&
            SignatureChecker.isValidSignatureNow(app, deleteHash, appSignature)
        ) {
            _deleteComment(commentId, author);
            return;
        }

        if (
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
        Comments.Comment storage comment = comments[commentId];

        // Store comment data for after hook
        Comments.Comment memory commentToDelete = comment;

        // Delete the comment
        delete comments[commentId];
        deleted[commentId] = true;

        Channels.Channel memory channel = channelManager.getChannel(
            commentToDelete.channelId
        );
        address hookAddress = address(channel.hook);

        if (
            hookAddress != address(0) && channel.permissions.afterDeleteComment
        ) {
            // Calculate hook value after protocol fee
            uint256 msgValueAfterFee = channelManager
                .deductProtocolHookTransactionFee(msg.value);

            channel.hook.afterDeleteComment{value: msgValueAfterFee}(
                commentToDelete,
                msg.sender,
                commentId
            );
        }

        emit CommentDeleted(commentId, author);
    }

    /// @notice Internal function to add an app signer approval
    /// @param author The address granting approval
    /// @param app The address being approved
    function _addApproval(address author, address app) internal {
        approvals[author][app] = true;
        emit ApprovalAdded(author, app);
    }

    /// @notice Internal function to remove an app signer approval
    /// @param author The address removing approval
    /// @param app The address being unapproved
    function _revokeApproval(address author, address app) internal {
        approvals[author][app] = false;
        emit ApprovalRemoved(author, app);
    }

    /// @inheritdoc ICommentManager
    function addApprovalAsAuthor(address app) external {
        _addApproval(msg.sender, app);
    }

    /// @inheritdoc ICommentManager
    function revokeApprovalAsAuthor(address app) external {
        _revokeApproval(msg.sender, app);
    }

    /// @inheritdoc ICommentManager
    function addApproval(
        address author,
        address app,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        if (block.timestamp > deadline) {
            revert SignatureDeadlineReached(deadline, block.timestamp);
        }

        if (nonces[author][app] != nonce) {
            revert InvalidNonce(author, app, nonces[author][app], nonce);
        }

        nonces[author][app]++;

        bytes32 addApprovalHash = getAddApprovalHash(
            author,
            app,
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

        _addApproval(author, app);
    }

    /// @inheritdoc ICommentManager
    function removeApproval(
        address author,
        address app,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        if (block.timestamp > deadline) {
            revert SignatureDeadlineReached(deadline, block.timestamp);
        }

        if (nonces[author][app] != nonce) {
            revert InvalidNonce(author, app, nonces[author][app], nonce);
        }

        nonces[author][app]++;

        bytes32 removeApprovalHash = getRemoveApprovalHash(
            author,
            app,
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

        _revokeApproval(author, app);
    }

    /// @inheritdoc ICommentManager
    function getAddApprovalHash(
        address author,
        address app,
        uint256 nonce,
        uint256 deadline
    ) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(ADD_APPROVAL_TYPEHASH, author, app, nonce, deadline)
        );

        return
            keccak256(
                abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
            );
    }

    /// @inheritdoc ICommentManager
    function getRemoveApprovalHash(
        address author,
        address app,
        uint256 nonce,
        uint256 deadline
    ) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(REMOVE_APPROVAL_TYPEHASH, author, app, nonce, deadline)
        );

        return
            keccak256(
                abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
            );
    }

    /// @inheritdoc ICommentManager
    function getDeleteCommentHash(
        bytes32 commentId,
        address author,
        address app,
        uint256 nonce,
        uint256 deadline
    ) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                DELETE_COMMENT_TYPEHASH,
                commentId,
                author,
                app,
                nonce,
                deadline
            )
        );

        return
            keccak256(
                abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
            );
    }

    /// @inheritdoc ICommentManager
    function getEditCommentHash(
        bytes32 commentId,
        Comments.EditCommentData calldata editData
    ) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                EDIT_COMMENT_TYPEHASH,
                commentId,
                keccak256(bytes(editData.content)),
                keccak256(bytes(editData.metadata)),
                editData.app,
                editData.nonce,
                editData.deadline
            )
        );

        return
            keccak256(
                abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
            );
    }

    /// @inheritdoc ICommentManager
    function getCommentId(
        Comments.CreateComment memory commentData
    ) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                ADD_COMMENT_TYPEHASH,
                keccak256(bytes(commentData.content)),
                keccak256(bytes(commentData.metadata)),
                keccak256(bytes(commentData.targetUri)),
                keccak256(bytes(commentData.commentType)),
                commentData.author,
                commentData.app,
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

    /// @inheritdoc ICommentManager
    function updateChannelContract(
        address _channelContract
    ) external onlyOwner {
        if (_channelContract == address(0)) revert ZeroAddress();
        channelManager = ChannelManager(payable(_channelContract));
    }

    /// @inheritdoc ICommentManager
    function getComment(
        bytes32 commentId
    ) external view returns (Comments.Comment memory) {
        Comments.Comment memory comment = comments[commentId];
        if (comment.author == address(0)) {
            revert CommentDoesNotExist();
        }
        return comment;
    }

    /// @inheritdoc ICommentManager
    function isApproved(
        address author,
        address app
    ) external view returns (bool) {
        return approvals[author][app];
    }

    /// @inheritdoc ICommentManager
    function getNonce(
        address author,
        address app
    ) external view returns (uint256) {
        return nonces[author][app];
    }

    /// @inheritdoc ICommentManager
    function isDeleted(bytes32 commentId) external view returns (bool) {
        return deleted[commentId];
    }
}
