// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "solady/auth/Ownable.sol";
import "solady/utils/ReentrancyGuard.sol";
import "./libraries/Comments.sol";
import "./libraries/CommentSigning.sol";
import "./libraries/Batching.sol";
import "./libraries/Approvals.sol";
import "./interfaces/ICommentManager.sol";
import "./interfaces/IHook.sol";
import "./ChannelManager.sol";
import "./libraries/Channels.sol";
/// @title CommentManager - A decentralized comments system
/// @notice This contract allows users to post and manage comments with optional app-signer approval and channel-specific hooks
/// @dev Implements EIP-712 for typed structured data hashing and signing
contract CommentManager is ICommentManager, ReentrancyGuard, Ownable {
  string public constant name = "ECP";
  string public constant version = "1";
  bytes32 public immutable DOMAIN_SEPARATOR;

  // On-chain storage mappings
  mapping(bytes32 => Comments.Comment) internal comments;
  /// @notice Mapping of author to app to approval expiry timestamp (0 means no approval)
  mapping(address => mapping(address => uint256)) internal approvals;
  /// @notice Mapping of author to app to nonce
  mapping(address => mapping(address => uint256)) internal nonces;
  /// @notice Mapping of comment ID to deleted status, if missing in mapping, the comment is not deleted
  mapping(bytes32 => bool) internal deleted;

  // Metadata storage mappings
  /// @notice Mapping of comment ID to metadata key to metadata value
  mapping(bytes32 => mapping(bytes32 => bytes)) public commentMetadata;
  /// @notice Mapping of comment ID to hook metadata key to hook metadata value
  mapping(bytes32 => mapping(bytes32 => bytes)) public commentHookMetadata;
  /// @notice Mapping of comment ID to array of metadata keys
  mapping(bytes32 => bytes32[]) public commentMetadataKeys;
  /// @notice Mapping of comment ID to array of hook metadata keys
  mapping(bytes32 => bytes32[]) public commentHookMetadataKeys;

  // Channel manager reference
  IChannelManager public channelManager;

  /// @notice Constructor initializes the contract with the deployer as owner and channel manager
  /// @dev Sets up EIP-712 domain separator
  /// @param initialOwner The address that will own the contract
  constructor(address initialOwner) {
    if (initialOwner == address(0)) revert ZeroAddress();

    _initializeOwner(initialOwner);

    DOMAIN_SEPARATOR = CommentSigning.generateDomainSeparator(
      name,
      version,
      block.chainid,
      address(this)
    );
  }

  /// @inheritdoc ICommentManager
  function postComment(
    Comments.CreateComment calldata commentData,
    bytes calldata appSignature
  ) external payable returns (bytes32) {
    return _postComment(commentData, appSignature, msg.value);
  }

  /// @notice Internal function to handle comment posting with explicit value
  function _postComment(
    Comments.CreateComment memory commentData,
    bytes memory appSignature,
    uint256 value
  )
    internal
    onlyAuthor(commentData.author)
    notStale(commentData.deadline)
    onlyParentIdOrTargetUri(commentData.parentId, commentData.targetUri)
    channelExists(commentData.channelId)
    replyInSameChannel(commentData.parentId, commentData.channelId)
    reactionHasTargetOrParent(
      commentData.commentType,
      commentData.parentId,
      commentData.targetUri
    )
    returns (bytes32)
  {
    bytes32 commentId = CommentSigning.getCommentId(
      commentData,
      DOMAIN_SEPARATOR
    );
    address app = commentData.app;

    // Verify the App signature.
    if (
      CommentSigning.verifyAppSignature(
        app,
        commentId,
        appSignature,
        msg.sender
      )
    ) {
      _createComment(
        commentId,
        commentData,
        Comments.AuthorAuthMethod.DIRECT_TX,
        value
      );
      return commentId;
    }

    revert InvalidAppSignature();
  }

  /// @inheritdoc ICommentManager
  function postCommentWithSig(
    Comments.CreateComment calldata commentData,
    bytes calldata authorSignature,
    bytes calldata appSignature
  ) external payable returns (bytes32) {
    return
      _postCommentWithSig(
        commentData,
        authorSignature,
        appSignature,
        msg.value
      );
  }

  /// @notice Internal function to handle comment posting with signature and explicit value
  function _postCommentWithSig(
    Comments.CreateComment memory commentData,
    bytes memory authorSignature,
    bytes memory appSignature,
    uint256 value
  )
    internal
    notStale(commentData.deadline)
    onlyParentIdOrTargetUri(commentData.parentId, commentData.targetUri)
    channelExists(commentData.channelId)
    replyInSameChannel(commentData.parentId, commentData.channelId)
    reactionHasTargetOrParent(
      commentData.commentType,
      commentData.parentId,
      commentData.targetUri
    )
    returns (bytes32)
  {
    bytes32 commentId = CommentSigning.getCommentId(
      commentData,
      DOMAIN_SEPARATOR
    );
    address app = commentData.app;

    if (
      !CommentSigning.verifyAppSignature(
        app,
        commentId,
        appSignature,
        msg.sender
      )
    ) {
      revert InvalidAppSignature();
    }

    // Verify the author signature.
    if (
      CommentSigning.verifyAuthorSignature(
        commentData.author,
        commentId,
        authorSignature
      )
    ) {
      _createComment(
        commentId,
        commentData,
        Comments.AuthorAuthMethod.AUTHOR_SIGNATURE,
        value
      );
      return commentId;
    } else if (
      CommentSigning.isApprovalValid(
        commentData.author,
        app,
        approvals[commentData.author][app]
      )
    ) {
      _createComment(
        commentId,
        commentData,
        Comments.AuthorAuthMethod.APP_APPROVAL,
        value
      );
      return commentId;
    }

    revert NotAuthorized(msg.sender, commentData.author);
  }

  function _createComment(
    bytes32 commentId,
    Comments.CreateComment memory commentData,
    Comments.AuthorAuthMethod authMethod,
    uint256 value
  ) internal {
    // Collect protocol comment fee, if any.
    uint96 commentCreationFee = channelManager.getCommentCreationFee();
    if (commentCreationFee > 0) {
      channelManager.collectCommentCreationFee{ value: commentCreationFee }();
    }

    Comments.createComment(
      commentId,
      commentData,
      authMethod,
      value,
      commentCreationFee,
      channelManager,
      comments,
      commentMetadata,
      commentMetadataKeys,
      commentHookMetadata,
      commentHookMetadataKeys,
      msg.sender
    );
  }

  /// @inheritdoc ICommentManager
  function editComment(
    bytes32 commentId,
    Comments.EditComment calldata editData,
    bytes calldata appSignature
  ) external payable {
    _editCommentDirect(commentId, editData, appSignature, msg.value);
  }

  /// @notice Internal function to handle comment editing with explicit value
  function _editCommentDirect(
    bytes32 commentId,
    Comments.EditComment memory editData,
    bytes memory appSignature,
    uint256 value
  )
    internal
    onlyAuthor(comments[commentId].author)
    notStale(editData.deadline)
    commentExists(commentId)
    validateNonce(
      comments[commentId].author,
      comments[commentId].app,
      editData.nonce
    )
  {
    Comments.Comment storage comment = comments[commentId];
    address author = comment.author;
    address app = editData.app;

    Approvals.incrementNonce(author, app, nonces);

    bytes32 editHash = CommentSigning.getEditCommentHash(
      commentId,
      author,
      editData,
      DOMAIN_SEPARATOR
    );

    // Verify the app signature.
    if (
      CommentSigning.verifyAppSignature(app, editHash, appSignature, msg.sender)
    ) {
      _editComment(
        commentId,
        editData,
        Comments.AuthorAuthMethod.DIRECT_TX,
        value
      );
      return;
    }

    revert InvalidAppSignature();
  }

  /// @inheritdoc ICommentManager
  function editCommentWithSig(
    bytes32 commentId,
    Comments.EditComment calldata editData,
    bytes calldata authorSignature,
    bytes calldata appSignature
  ) external payable {
    _editCommentWithSig(
      commentId,
      editData,
      authorSignature,
      appSignature,
      msg.value
    );
  }

  /// @notice Internal function to handle comment editing with signature and explicit value
  function _editCommentWithSig(
    bytes32 commentId,
    Comments.EditComment memory editData,
    bytes memory authorSignature,
    bytes memory appSignature,
    uint256 value
  )
    internal
    notStale(editData.deadline)
    commentExists(commentId)
    validateNonce(
      comments[commentId].author,
      comments[commentId].app,
      editData.nonce
    )
  {
    Comments.Comment storage comment = comments[commentId];
    address author = comment.author;
    address app = editData.app;

    Approvals.incrementNonce(author, app, nonces);

    require(author != address(0), "Comment does not exist");

    bytes32 editHash = CommentSigning.getEditCommentHash(
      commentId,
      author,
      editData,
      DOMAIN_SEPARATOR
    );

    // Verify the app signature.
    if (
      !CommentSigning.verifyAppSignature(
        app,
        editHash,
        appSignature,
        msg.sender
      )
    ) {
      revert InvalidAppSignature();
    }

    // Verify the author signature.
    if (
      CommentSigning.verifyAuthorSignature(author, editHash, authorSignature)
    ) {
      _editComment(
        commentId,
        editData,
        Comments.AuthorAuthMethod.AUTHOR_SIGNATURE,
        value
      );
      return;
    } else if (
      CommentSigning.isApprovalValid(author, app, approvals[author][app])
    ) {
      _editComment(
        commentId,
        editData,
        Comments.AuthorAuthMethod.APP_APPROVAL,
        value
      );
      return;
    }

    revert NotAuthorized(msg.sender, author);
  }

  /// @notice Internal function to handle comment editing logic
  /// @param commentId The unique identifier of the comment to edit
  /// @param editData The comment data struct containing content and metadata
  /// @param authMethod The authentication method used for this edit
  function _editComment(
    bytes32 commentId,
    Comments.EditComment memory editData,
    Comments.AuthorAuthMethod authMethod,
    uint256 value
  ) internal {
    Comments.editComment(
      commentId,
      editData,
      authMethod,
      value,
      channelManager,
      comments,
      commentMetadata,
      commentMetadataKeys,
      commentHookMetadata,
      commentHookMetadataKeys,
      msg.sender
    );
  }

  /// @inheritdoc ICommentManager
  function deleteComment(
    bytes32 commentId
  ) public commentExists(commentId) onlyAuthor(comments[commentId].author) {
    _deleteComment(commentId, msg.sender);
  }

  /// @inheritdoc ICommentManager
  function deleteCommentWithSig(
    bytes32 commentId,
    address app,
    uint256 deadline,
    bytes calldata authorSignature,
    bytes calldata appSignature
  ) public notStale(deadline) commentExists(commentId) {
    Comments.Comment storage comment = comments[commentId];
    address author = comment.author;

    bytes32 deleteHash = CommentSigning.getDeleteCommentHash(
      commentId,
      author,
      app,
      deadline,
      DOMAIN_SEPARATOR
    );

    // for deleting comment, only single party (either author or app) is needed for authorization
    bool isAuthorizedByAuthor = (msg.sender == author ||
      CommentSigning.verifyAuthorSignature(
        author,
        deleteHash,
        authorSignature
      ));

    bool isAuthorizedByApprovedApp = CommentSigning.isApprovalValid(
      author,
      app,
      approvals[author][app]
    ) &&
      CommentSigning.verifyAppSignature(
        app,
        deleteHash,
        appSignature,
        msg.sender
      );

    if (isAuthorizedByAuthor || isAuthorizedByApprovedApp) {
      _deleteComment(commentId, author);
      return;
    }

    revert NotAuthorized(msg.sender, author);
  }

  /// @notice Internal function to handle comment deletion logic
  /// @param commentId The unique identifier of the comment to delete
  /// @param author The address of the comment author
  function _deleteComment(bytes32 commentId, address author) internal {
    Comments.deleteComment(
      commentId,
      author,
      channelManager,
      comments,
      deleted,
      commentMetadata,
      commentMetadataKeys,
      commentHookMetadata,
      commentHookMetadataKeys,
      msg.sender,
      msg.value
    );
  }

  /// @notice Internal function to get metadata for a comment
  /// @param commentId The unique identifier of the comment
  /// @return The metadata entries for the comment

  /// @inheritdoc ICommentManager
  function addApproval(address app, uint256 expiry) external {
    Approvals.addApproval(msg.sender, app, expiry, approvals);
  }

  /// @inheritdoc ICommentManager
  function addApprovalWithSig(
    address author,
    address app,
    uint256 expiry,
    uint256 nonce,
    uint256 deadline,
    bytes calldata authorSignature
  ) external notStale(deadline) validateNonce(author, app, nonce) {
    Approvals.incrementNonce(author, app, nonces);

    bytes32 addApprovalHash = CommentSigning.getAddApprovalHash(
      author,
      app,
      expiry,
      nonce,
      deadline,
      DOMAIN_SEPARATOR
    );

    if (
      !CommentSigning.verifyAuthorSignature(
        author,
        addApprovalHash,
        authorSignature
      )
    ) {
      revert InvalidAuthorSignature();
    }

    Approvals.addApproval(author, app, expiry, approvals);
  }

  /// @inheritdoc ICommentManager
  function revokeApproval(address app) external {
    Approvals.revokeApproval(msg.sender, app, approvals);
  }

  /// @inheritdoc ICommentManager
  function removeApprovalWithSig(
    address author,
    address app,
    uint256 nonce,
    uint256 deadline,
    bytes calldata authorSignature
  ) external notStale(deadline) validateNonce(author, app, nonce) {
    Approvals.incrementNonce(author, app, nonces);

    bytes32 removeApprovalHash = CommentSigning.getRemoveApprovalHash(
      author,
      app,
      nonce,
      deadline,
      DOMAIN_SEPARATOR
    );

    if (
      !CommentSigning.verifyAuthorSignature(
        author,
        removeApprovalHash,
        authorSignature
      )
    ) {
      revert InvalidAuthorSignature();
    }

    Approvals.revokeApproval(author, app, approvals);
  }

  /// @inheritdoc ICommentManager
  function getAddApprovalHash(
    address author,
    address app,
    uint256 expiry,
    uint256 nonce,
    uint256 deadline
  ) public view returns (bytes32) {
    return
      CommentSigning.getAddApprovalHash(
        author,
        app,
        expiry,
        nonce,
        deadline,
        DOMAIN_SEPARATOR
      );
  }

  /// @inheritdoc ICommentManager
  function getRemoveApprovalHash(
    address author,
    address app,
    uint256 nonce,
    uint256 deadline
  ) public view returns (bytes32) {
    return
      CommentSigning.getRemoveApprovalHash(
        author,
        app,
        nonce,
        deadline,
        DOMAIN_SEPARATOR
      );
  }

  /// @inheritdoc ICommentManager
  function getDeleteCommentHash(
    bytes32 commentId,
    address author,
    address app,
    uint256 deadline
  ) public view returns (bytes32) {
    return
      CommentSigning.getDeleteCommentHash(
        commentId,
        author,
        app,
        deadline,
        DOMAIN_SEPARATOR
      );
  }

  /// @inheritdoc ICommentManager
  function getEditCommentHash(
    bytes32 commentId,
    address author,
    Comments.EditComment calldata editData
  ) public view returns (bytes32) {
    return
      CommentSigning.getEditCommentHash(
        commentId,
        author,
        editData,
        DOMAIN_SEPARATOR
      );
  }

  /// @inheritdoc ICommentManager
  function getCommentId(
    Comments.CreateComment memory commentData
  ) public view returns (bytes32) {
    return CommentSigning.getCommentId(commentData, DOMAIN_SEPARATOR);
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
    return comments[commentId];
  }

  /// @inheritdoc ICommentManager
  function getCommentMetadata(
    bytes32 commentId
  ) external view returns (Metadata.MetadataEntry[] memory) {
    return
      Metadata.getCommentMetadata(
        commentId,
        commentMetadata,
        commentMetadataKeys
      );
  }

  /// @inheritdoc ICommentManager
  function getCommentHookMetadata(
    bytes32 commentId
  ) external view returns (Metadata.MetadataEntry[] memory) {
    return
      Metadata.getCommentHookMetadata(
        commentId,
        commentHookMetadata,
        commentHookMetadataKeys
      );
  }

  /// @inheritdoc ICommentManager
  function getCommentMetadataValue(
    bytes32 commentId,
    bytes32 key
  ) external view returns (bytes memory) {
    return commentMetadata[commentId][key];
  }

  /// @inheritdoc ICommentManager
  function getCommentHookMetadataValue(
    bytes32 commentId,
    bytes32 key
  ) external view returns (bytes memory) {
    return commentHookMetadata[commentId][key];
  }

  /// @inheritdoc ICommentManager
  function getCommentMetadataKeys(
    bytes32 commentId
  ) external view returns (bytes32[] memory) {
    return commentMetadataKeys[commentId];
  }

  /// @inheritdoc ICommentManager
  function getCommentHookMetadataKeys(
    bytes32 commentId
  ) external view returns (bytes32[] memory) {
    return commentHookMetadataKeys[commentId];
  }

  /// @inheritdoc ICommentManager
  function isApproved(
    address author,
    address app
  ) external view returns (bool) {
    return Approvals.isApproved(author, app, approvals);
  }

  /// @inheritdoc ICommentManager
  function getApprovalExpiry(
    address author,
    address app
  ) external view returns (uint256) {
    return Approvals.getApprovalExpiry(author, app, approvals);
  }

  /// @inheritdoc ICommentManager
  function getNonce(
    address author,
    address app
  ) external view returns (uint256) {
    return Approvals.getNonce(author, app, nonces);
  }

  /// @inheritdoc ICommentManager
  function isDeleted(bytes32 commentId) external view returns (bool) {
    return deleted[commentId];
  }

  modifier channelExists(uint256 channelId) {
    if (!channelManager.channelExists(channelId)) {
      revert IChannelManager.ChannelDoesNotExist();
    }
    _;
  }

  modifier commentExists(bytes32 commentId) {
    if (comments[commentId].author == address(0)) {
      revert CommentDoesNotExist();
    }
    _;
  }

  modifier notStale(uint256 deadline) {
    if (block.timestamp > deadline) {
      revert SignatureDeadlineReached(deadline, block.timestamp);
    }
    _;
  }

  modifier replyInSameChannel(bytes32 parentId, uint256 channelId) {
    if (parentId != bytes32(0) && comments[parentId].channelId != channelId) {
      revert ParentCommentNotInSameChannel();
    }
    _;
  }

  modifier onlyParentIdOrTargetUri(bytes32 parentId, string memory targetUri) {
    if (parentId != bytes32(0)) {
      if (comments[parentId].author == address(0) && !deleted[parentId]) {
        revert ParentCommentHasNeverExisted();
      }

      if (bytes(targetUri).length > 0) {
        revert InvalidCommentReference(
          "Parent comment and targetUri cannot both be set"
        );
      }
    }

    _;
  }

  modifier validateNonce(address author, address app, uint256 nonce) {
    Approvals.validateNonce(author, app, nonce, nonces);
    _;
  }

  modifier onlyAuthor(address author) {
    require(msg.sender == author, "Not comment author");

    _;
  }

  /// @inheritdoc ICommentManager
  function updateCommentHookData(
    bytes32 commentId
  ) external commentExists(commentId) {
    Comments.updateCommentHookData(
      commentId,
      channelManager,
      comments,
      commentMetadata,
      commentMetadataKeys,
      commentHookMetadata,
      commentHookMetadataKeys,
      msg.sender
    );
  }

  modifier reactionHasTargetOrParent(
    uint8 commentType,
    bytes32 parentId,
    string memory targetUri
  ) {
    if (commentType == Comments.COMMENT_TYPE_REACTION) {
      bool hasParent = parentId != bytes32(0);
      bool hasTarget = bytes(targetUri).length > 0;
      if (!hasParent && !hasTarget) {
        revert InvalidReactionReference(
          "Reactions must have either a parentId or targetUri"
        );
      }
    }
    _;
  }

  // ============ BATCH OPERATIONS ============

  /// @inheritdoc ICommentManager
  function batchOperations(
    Comments.BatchOperation[] calldata operations
  ) external payable nonReentrant returns (bytes[] memory results) {
    // Validate batch operations
    Batching.validateBatchOperations(operations, msg.value);

    results = new bytes[](operations.length);

    // Execute operations in order
    for (uint i = 0; i < operations.length; i++) {
      Batching.validateBatchOperationSignatures(operations[i], i);
      results[i] = _executeBatchOperation(operations[i], i);
    }

    Batching.emitBatchOperationExecuted(
      msg.sender,
      operations.length,
      msg.value
    );

    return results;
  }

  /// @notice Internal function to execute a single batch operation
  /// @param operation The batch operation to execute
  /// @param operationIndex The index of the operation for error reporting
  /// @return result The result of the operation
  function _executeBatchOperation(
    Comments.BatchOperation calldata operation,
    uint256 operationIndex
  ) internal returns (bytes memory result) {
    if (operation.operationType == Comments.BatchOperationType.POST_COMMENT) {
      return _executePostCommentBatch(operation, operationIndex);
    } else if (
      operation.operationType ==
      Comments.BatchOperationType.POST_COMMENT_WITH_SIG
    ) {
      return _executePostCommentWithSigBatch(operation, operationIndex);
    } else if (
      operation.operationType == Comments.BatchOperationType.EDIT_COMMENT
    ) {
      return _executeEditCommentBatch(operation, operationIndex);
    } else if (
      operation.operationType ==
      Comments.BatchOperationType.EDIT_COMMENT_WITH_SIG
    ) {
      return _executeEditCommentWithSigBatch(operation, operationIndex);
    } else if (
      operation.operationType == Comments.BatchOperationType.DELETE_COMMENT
    ) {
      return _executeDeleteCommentBatch(operation, operationIndex);
    } else if (
      operation.operationType ==
      Comments.BatchOperationType.DELETE_COMMENT_WITH_SIG
    ) {
      return _executeDeleteCommentWithSigBatch(operation, operationIndex);
    } else {
      revert InvalidBatchOperation(operationIndex, "Invalid operation type");
    }
  }

  function _executePostCommentBatch(
    Comments.BatchOperation calldata operation,
    uint256 operationIndex
  ) internal returns (bytes memory) {
    Comments.CreateComment memory commentData = Batching.decodePostCommentData(
      operation
    );

    // Call internal postComment function with allocated value
    bytes32 commentId = _postComment(
      commentData,
      operation.signatures[0], // app signature
      operation.value
    );

    return Batching.encodeCommentIdResult(commentId);
  }

  function _executePostCommentWithSigBatch(
    Comments.BatchOperation calldata operation,
    uint256 operationIndex
  ) internal returns (bytes memory) {
    Comments.CreateComment memory commentData = Batching.decodePostCommentData(
      operation
    );

    // Call postCommentWithSig function directly
    bytes32 commentId = _postCommentWithSig(
      commentData,
      operation.signatures[0], // author signature
      operation.signatures[1], // app signature
      operation.value
    );

    return Batching.encodeCommentIdResult(commentId);
  }

  function _executeEditCommentBatch(
    Comments.BatchOperation calldata operation,
    uint256 operationIndex
  ) internal returns (bytes memory) {
    (bytes32 commentId, Comments.EditComment memory editData) = Batching
      .decodeEditCommentData(operation);

    // Call internal editComment function with allocated value
    _editCommentDirect(
      commentId,
      editData,
      operation.signatures[0], // app signature
      operation.value
    );

    return Batching.getEmptyResult();
  }

  function _executeEditCommentWithSigBatch(
    Comments.BatchOperation calldata operation,
    uint256 operationIndex
  ) internal returns (bytes memory) {
    (bytes32 commentId, Comments.EditComment memory editData) = Batching
      .decodeEditCommentData(operation);

    // Call editCommentWithSig internal function with allocated value
    _editCommentWithSig(
      commentId,
      editData,
      operation.signatures[0], // author signature
      operation.signatures[1], // app signature
      operation.value
    );

    return Batching.getEmptyResult();
  }

  function _executeDeleteCommentBatch(
    Comments.BatchOperation calldata operation,
    uint256 operationIndex
  ) internal returns (bytes memory) {
    bytes32 commentId = Batching.decodeDeleteCommentData(operation);

    // Call deleteComment function directly (preserves msg.sender)
    deleteComment(commentId);

    return Batching.getEmptyResult();
  }

  function _executeDeleteCommentWithSigBatch(
    Comments.BatchOperation calldata operation,
    uint256 operationIndex
  ) internal returns (bytes memory) {
    Comments.BatchDeleteData memory deleteData = Batching
      .decodeDeleteCommentWithSigData(operation);

    // Call deleteCommentWithSig function directly
    deleteCommentWithSig(
      deleteData.commentId,
      deleteData.app,
      deleteData.deadline,
      operation.signatures[0], // author signature
      operation.signatures[1] // app signature
    );

    return Batching.getEmptyResult();
  }
}
