// SPDX-License-Identifier: MIT
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
      "AddComment(string content,string metadata,string targetUri,string commentType,address author,address app,uint256 channelId,uint256 deadline,bytes32 parentId)"
    );
  bytes32 public constant DELETE_COMMENT_TYPEHASH =
    keccak256(
      "DeleteComment(bytes32 commentId,address author,address app,uint256 deadline)"
    );
  bytes32 public constant EDIT_COMMENT_TYPEHASH =
    keccak256(
      "EditComment(bytes32 commentId,string content,string metadata,address author,address app,uint256 nonce,uint256 deadline)"
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
  function postComment(
    Comments.CreateComment calldata commentData,
    bytes calldata appSignature
  ) external payable {
    _postComment(commentData, bytes(""), appSignature);
  }

  /// @inheritdoc ICommentManager
  function postCommentWithSig(
    Comments.CreateComment calldata commentData,
    bytes calldata authorSignature,
    bytes calldata appSignature
  ) external payable {
    _postComment(commentData, authorSignature, appSignature);
  }

  /// @notice Internal function to handle comment posting logic
  /// @param commentData The comment data struct containing content and metadata
  /// @param authorSignature Signature from the author (empty if called via postComment)
  /// @param appSignature Signature from the app signer
  function _postComment(
    Comments.CreateComment calldata commentData,
    bytes memory authorSignature,
    bytes memory appSignature
  ) internal {
    address author = commentData.author;
    address app = commentData.app;
    uint256 channelId = commentData.channelId;
    bytes32 parentId = commentData.parentId;
    string calldata content = commentData.content;
    string calldata metadata = commentData.metadata;
    string calldata targetUri = commentData.targetUri;
    string calldata commentType = commentData.commentType;

    guardBlockTimestamp(commentData.deadline);
    guardParentCommentAndTargetUri(parentId, targetUri);
    guardChannelExists(channelId);

    bytes32 commentId = getCommentId(commentData);

    guardAuthorizedByAuthorAndApp(
      author,
      app,
      commentId,
      authorSignature,
      appSignature
    );

    Comments.Comment storage comment = comments[commentId];

    uint96 timestampNow = uint96(block.timestamp);

    comment.author = author;
    comment.app = app;
    comment.channelId = channelId;
    comment.parentId = parentId;
    comment.content = content;
    comment.metadata = metadata;
    comment.targetUri = targetUri;
    comment.commentType = commentType;
    comment.createdAt = timestampNow;
    comment.updatedAt = timestampNow;
    comment.hookData = "";

    Channels.Channel memory channel = channelManager.getChannel(channelId);

    // emit event before calling the `onCommentAdd` hook to ensure the order of events is correct in the case of reentrancy
    emit CommentAdded(
      commentId,
      author,
      app,
      channelId,
      parentId,
      timestampNow,
      content,
      metadata,
      targetUri,
      commentType,
      comment.hookData
    );

    if (channel.hook != address(0) && channel.permissions.onCommentAdd) {
      IHook hook = IHook(channel.hook);
      // Calculate hook value after protocol fee
      uint256 msgValueAfterFee = channelManager
        .deductProtocolHookTransactionFee(msg.value);

      string memory hookData = hook.onCommentAdd{ value: msgValueAfterFee }(
        comment,
        msg.sender,
        commentId
      );

      comment.hookData = hookData;

      emit CommentHookDataUpdated(commentId, hookData);
    }
  }

  /// @inheritdoc ICommentManager
  function editComment(
    bytes32 commentId,
    Comments.EditComment calldata editData,
    bytes calldata appSignature
  ) external payable {
    _editComment(commentId, editData, bytes(""), appSignature);
  }

  /// @inheritdoc ICommentManager
  function editCommentWithSig(
    bytes32 commentId,
    Comments.EditComment calldata editData,
    bytes calldata authorSignature,
    bytes calldata appSignature
  ) external payable {
    _editComment(commentId, editData, authorSignature, appSignature);
  }

  /// @notice Internal function to handle comment editing logic
  /// @param commentId The unique identifier of the comment to edit
  /// @param editData The comment data struct containing content and metadata
  /// @param authorSignature Signature from the author (empty if called via editComment)
  /// @param appSignature Signature from the app signer
  function _editComment(
    bytes32 commentId,
    Comments.EditComment calldata editData,
    bytes memory authorSignature,
    bytes memory appSignature
  ) internal {
    guardBlockTimestamp(editData.deadline);

    Comments.Comment storage comment = comments[commentId];
    address author = comment.author;
    address editingApp = editData.app;

    require(author != address(0), "Comment does not exist");

    guardNonceAndIncrement(author, editingApp, editData.nonce);

    bytes32 editHash = getEditCommentHash(commentId, author, editData);

    guardAuthorizedByAuthorAndApp(
      author,
      editingApp,
      editHash,
      authorSignature,
      appSignature
    );

    string calldata content = editData.content;
    string calldata metadata = editData.metadata;
    uint96 timestampNow = uint96(block.timestamp);

    comment.content = content;
    comment.metadata = metadata;
    comment.updatedAt = timestampNow;

    Channels.Channel memory channel = channelManager.getChannel(
      comment.channelId
    );

    // emit event before calling the `onCommentEdit` hook to ensure the order of events is correct in the case of reentrancy
    emit CommentEdited(
      commentId,
      editingApp,
      author,
      comment.app,
      comment.channelId,
      comment.parentId,
      comment.createdAt,
      timestampNow,
      content,
      metadata,
      comment.targetUri,
      comment.commentType,
      comment.hookData
    );

    if (channel.hook != address(0) && channel.permissions.onCommentEdit) {
      IHook hook = IHook(channel.hook);

      // Calculate hook value after protocol fee
      uint256 msgValueAfterFee = channelManager
        .deductProtocolHookTransactionFee(msg.value);

      string memory hookData = hook.onCommentEdit{ value: msgValueAfterFee }(
        comment,
        msg.sender,
        commentId
      );

      comment.hookData = hookData;

      emit CommentHookDataUpdated(commentId, hookData);
    }
  }

  /// @inheritdoc ICommentManager
  function deleteComment(bytes32 commentId) external {
    Comments.Comment storage comment = comments[commentId];
    address author = comment.author;

    require(author != address(0), "Comment does not exist");
    require(author == msg.sender, "Not comment author");

    _deleteComment(commentId, msg.sender);
  }

  /// @inheritdoc ICommentManager
  function deleteCommentWithSig(
    bytes32 commentId,
    address app,
    uint256 deadline,
    bytes calldata authorSignature,
    bytes calldata appSignature
  ) external {
    guardBlockTimestamp(deadline);

    Comments.Comment storage comment = comments[commentId];
    address author = comment.author;

    require(author != address(0), "Comment does not exist");

    bytes32 deleteHash = getDeleteCommentHash(commentId, author, app, deadline);

    // for deleting comment, only single party (either author or app) is needed for authorization
    guardAuthorizedByAuthorOrApp(
      author,
      app,
      deleteHash,
      authorSignature,
      appSignature
    );

    _deleteComment(commentId, author);
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

    // emit event before calling the `onCommentDelete` hook to ensure the order of events is correct in the case of reentrancy
    emit CommentDeleted(commentId, author);

    if (channel.hook != address(0) && channel.permissions.onCommentDelete) {
      IHook hook = IHook(channel.hook);
      // Calculate hook value after protocol fee
      uint256 msgValueAfterFee = channelManager
        .deductProtocolHookTransactionFee(msg.value);

      hook.onCommentDelete{ value: msgValueAfterFee }(
        commentToDelete,
        msg.sender,
        commentId
      );
    }
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
  function addApproval(address app) external {
    _addApproval(msg.sender, app);
  }

  /// @inheritdoc ICommentManager
  function revokeApproval(address app) external {
    _revokeApproval(msg.sender, app);
  }

  /// @inheritdoc ICommentManager
  function addApprovalWithSig(
    address author,
    address app,
    uint256 nonce,
    uint256 deadline,
    bytes calldata signature
  ) external {
    guardBlockTimestamp(deadline);

    guardNonceAndIncrement(author, app, nonce);

    bytes32 addApprovalHash = getAddApprovalHash(author, app, nonce, deadline);

    guardAuthorizedByAuthor(author, addApprovalHash, signature);

    _addApproval(author, app);
  }

  /// @inheritdoc ICommentManager
  function removeApprovalWithSig(
    address author,
    address app,
    uint256 nonce,
    uint256 deadline,
    bytes calldata signature
  ) external {
    guardBlockTimestamp(deadline);

    guardNonceAndIncrement(author, app, nonce);

    bytes32 removeApprovalHash = getRemoveApprovalHash(
      author,
      app,
      nonce,
      deadline
    );

    guardAuthorizedByAuthor(author, removeApprovalHash, signature);

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
      keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
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
      keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
  }

  /// @inheritdoc ICommentManager
  function getDeleteCommentHash(
    bytes32 commentId,
    address author,
    address app,
    uint256 deadline
  ) public view returns (bytes32) {
    bytes32 structHash = keccak256(
      abi.encode(DELETE_COMMENT_TYPEHASH, commentId, author, app, deadline)
    );

    return
      keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
  }

  /// @inheritdoc ICommentManager
  function getEditCommentHash(
    bytes32 commentId,
    address author,
    Comments.EditComment calldata editData
  ) public view returns (bytes32) {
    bytes32 structHash = keccak256(
      abi.encode(
        EDIT_COMMENT_TYPEHASH,
        commentId,
        keccak256(bytes(editData.content)),
        keccak256(bytes(editData.metadata)),
        author,
        editData.app,
        editData.nonce,
        editData.deadline
      )
    );

    return
      keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
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
        commentData.deadline,
        commentData.parentId
      )
    );

    return
      keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
  }

  /// @inheritdoc ICommentManager
  function updateChannelContract(address _channelContract) external onlyOwner {
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

  /// @notice Internal function to guard against timestamp expiration
  /// @param deadline The timestamp after which the operation is no longer valid
  function guardBlockTimestamp(uint256 deadline) internal view {
    if (block.timestamp > deadline) {
      revert SignatureDeadlineReached(deadline, block.timestamp);
    }
  }

  /// @notice Internal function prevent replay attack by check nonce and increment it
  /// @param author The address of the comment author
  /// @param app The address of the app signer
  /// @param nonce The nonce for the comment
  function guardNonceAndIncrement(
    address author,
    address app,
    uint256 nonce
  ) internal {
    if (nonces[author][app] != nonce) {
      revert InvalidNonce(author, app, nonces[author][app], nonce);
    }

    nonces[author][app]++;
  }

  /// @notice Internal function to validate 1) parent comment ever existed 2) prevent parentId and targetUri from being set together
  /// @param parentId The ID of the parent comment if this is a reply, otherwise bytes32(0)
  /// @param targetUri the URI about which the comment is being made
  function guardParentCommentAndTargetUri(
    bytes32 parentId,
    string calldata targetUri
  ) internal view {
    if (parentId == bytes32(0)) {
      return;
    }

    if (comments[parentId].author == address(0) && !deleted[parentId]) {
      revert ParentCommentHasNeverExisted();
    }

    if (bytes(targetUri).length > 0) {
      revert InvalidCommentReference(
        "Parent comment and targetUri cannot both be set"
      );
    }
  }

  /// @notice Internal function to validate channel exists
  /// @param channelId The ID of the channel
  function guardChannelExists(uint256 channelId) internal view {
    if (!channelManager.channelExists(channelId)) {
      revert IChannelManager.ChannelDoesNotExist();
    }
  }

  /// @notice Internal function to ensure both author and app are authorized to perform the action
  /// @param author The address of the comment author
  /// @param app The address of the app signer
  /// @param sigHash The hash used to generate the signature
  /// @param authorSignature The signature of the author
  /// @param appSignature The signature of the app signer
  function guardAuthorizedByAuthorAndApp(
    address author,
    address app,
    bytes32 sigHash,
    bytes memory authorSignature,
    bytes memory appSignature
  ) internal view {
    if (
      // skip app signature check if msg.sender is the app itself
      msg.sender != app &&
      !SignatureChecker.isValidSignatureNow(app, sigHash, appSignature)
    ) {
      revert InvalidAppSignature();
    }

    if (
      // skip author signature check if msg.sender is the author
      msg.sender == author ||
      approvals[author][app] ||
      // consider authorized if the author has signed the comment hash
      SignatureChecker.isValidSignatureNow(author, sigHash, authorSignature)
    ) {
      return;
    }

    revert NotAuthorized(msg.sender, author);
  }

  /// @notice Internal function to ensure either author or app is authorized to perform the action
  /// @param author The address of the comment author
  /// @param app The address of the app signer
  /// @param sigHash The hash used to generate the signature
  /// @param authorSignature The signature of the author
  /// @param appSignature The signature of the app signer
  function guardAuthorizedByAuthorOrApp(
    address author,
    address app,
    bytes32 sigHash,
    bytes memory authorSignature,
    bytes memory appSignature
  ) internal view {
    bool isAuthorizedByAuthor = (msg.sender == author ||
      SignatureChecker.isValidSignatureNow(author, sigHash, authorSignature));

    bool isAuthorizedByApprovedApp = approvals[author][app] &&
      (msg.sender == app ||
        SignatureChecker.isValidSignatureNow(app, sigHash, appSignature));

    if (isAuthorizedByAuthor || isAuthorizedByApprovedApp) {
      return;
    }

    revert NotAuthorized(msg.sender, author);
  }

  /// @notice Internal function to ensure either author is authorized to perform the action
  /// @param author The address of the comment author
  /// @param sigHash The hash used to generate the signature
  /// @param authorSignature The signature of the author
  function guardAuthorizedByAuthor(
    address author,
    bytes32 sigHash,
    bytes memory authorSignature
  ) internal view {
    if (
      msg.sender == author ||
      SignatureChecker.isValidSignatureNow(author, sigHash, authorSignature)
    ) {
      return;
    }

    revert InvalidAuthorSignature();
  }
}
