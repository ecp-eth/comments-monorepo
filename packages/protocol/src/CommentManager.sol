// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./libraries/Comments.sol";
import "./interfaces/ICommentManager.sol";
import "./interfaces/IHook.sol";
import "./ChannelManager.sol";
import "./libraries/Channels.sol";

/// @title CommentManager - A decentralized comments system
/// @notice This contract allows users to post and manage comments with optional app-signer approval and channel-specific hooks
/// @dev Implements EIP-712 for typed structured data hashing and signing
contract CommentManager is ICommentManager, ReentrancyGuard, Pausable, Ownable {
  string public constant name = "ECP";
  string public constant version = "1";
  bytes32 public immutable DOMAIN_SEPARATOR;
  bytes32 public constant ADD_COMMENT_TYPEHASH =
    keccak256(
      "AddComment(string content,MetadataEntry[] metadata,string targetUri,uint8 commentType,address author,address app,uint256 channelId,uint256 deadline,bytes32 parentId)MetadataEntry(bytes32 key,bytes value)"
    );
  bytes32 public constant DELETE_COMMENT_TYPEHASH =
    keccak256(
      "DeleteComment(bytes32 commentId,address author,address app,uint256 deadline)"
    );
  bytes32 public constant EDIT_COMMENT_TYPEHASH =
    keccak256(
      "EditComment(bytes32 commentId,string content,MetadataEntry[] metadata,address author,address app,uint256 nonce,uint256 deadline)MetadataEntry(bytes32 key,bytes value)"
    );
  bytes32 public constant ADD_APPROVAL_TYPEHASH =
    keccak256(
      "AddApproval(address author,address app,uint256 expiry,uint256 nonce,uint256 deadline)"
    );
  bytes32 public constant REMOVE_APPROVAL_TYPEHASH =
    keccak256(
      "RemoveApproval(address author,address app,uint256 nonce,uint256 deadline)"
    );

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
    bytes32 commentId = getCommentId(commentData);
    address app = commentData.app;

    // Verify the App signature.
    if (
      // for direct contract calls where msg.sender = app = comment.author
      msg.sender == app ||
      // or comment.app signs the comment
      SignatureChecker.isValidSignatureNow(app, commentId, appSignature)
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
    bytes32 commentId = getCommentId(commentData);
    address app = commentData.app;

    if (
      // skip app signature check if msg.sender is the app itself
      msg.sender != app &&
      !SignatureChecker.isValidSignatureNow(app, commentId, appSignature)
    ) {
      revert InvalidAppSignature();
    }

    // Verify the author signature.
    if (
      // consider authorized if the author has signed the comment hash
      SignatureChecker.isValidSignatureNow(
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
    } else if (approvals[commentData.author][app] > block.timestamp) {
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
    uint256 remainingValue = value - commentCreationFee;

    address author = commentData.author;
    address app = commentData.app;
    uint256 channelId = commentData.channelId;
    bytes32 parentId = commentData.parentId;
    string memory content = commentData.content;
    Metadata.MetadataEntry[] memory metadata = commentData.metadata;
    string memory targetUri = commentData.targetUri;
    uint8 commentType = commentData.commentType;
    uint88 timestampNow = uint88(block.timestamp);

    Comments.Comment storage comment = comments[commentId];

    comment.author = author;
    comment.app = app;
    comment.channelId = channelId;
    comment.parentId = parentId;
    comment.content = content;
    comment.targetUri = targetUri;
    comment.commentType = commentType;
    comment.authMethod = uint8(authMethod);
    comment.createdAt = timestampNow;
    comment.updatedAt = timestampNow;

    // emit event before calling the `onCommentAdd` hook to ensure the order of events is correct in the case of reentrancy
    emit CommentAdded(
      commentId,
      author,
      app,
      channelId,
      parentId,
      timestampNow,
      content,
      targetUri,
      commentType,
      comment.authMethod,
      metadata
    );

    // Store metadata in mappings
    if (metadata.length > 0) {
      mapping(bytes32 => bytes) storage commentMetadataForId = commentMetadata[
        commentId
      ];
      bytes32[] storage commentMetadataKeysForId = commentMetadataKeys[
        commentId
      ];
      for (uint i = 0; i < metadata.length; i++) {
        bytes32 key = metadata[i].key;
        bytes memory val = metadata[i].value;

        commentMetadataForId[key] = val;
        commentMetadataKeysForId.push(key);

        emit CommentMetadataSet(commentId, key, val);
      }
    }

    Channels.Channel memory channel = channelManager.getChannel(channelId);

    if (channel.hook != address(0) && channel.permissions.onCommentAdd) {
      IHook hook = IHook(channel.hook);
      // Calculate hook value after protocol fee
      uint256 valueToPassToTheHook = channelManager
        .deductProtocolHookTransactionFee(remainingValue);
      if (remainingValue > valueToPassToTheHook) {
        // send the hook transaction fee to the channel manager
        payable(address(channelManager)).transfer(
          remainingValue - valueToPassToTheHook
        );
      }

      Metadata.MetadataEntry[] memory hookMetadata = hook.onCommentAdd{ // forward the remaining sent value to the hook.
        value: valueToPassToTheHook
      }(comment, metadata, msg.sender, commentId);

      // Store hook metadata
      if (hookMetadata.length > 0) {
        mapping(bytes32 => bytes)
          storage commentHookMetadataForId = commentHookMetadata[commentId];
        bytes32[]
          storage commentHookMetadataKeysForId = commentHookMetadataKeys[
            commentId
          ];
        for (uint i = 0; i < hookMetadata.length; i++) {
          bytes32 key = hookMetadata[i].key;
          bytes memory val = hookMetadata[i].value;

          commentHookMetadataForId[key] = val;
          commentHookMetadataKeysForId.push(key);

          emit CommentHookMetadataSet(commentId, key, val);
        }
      }
    }
    // refund excess payment if any
    else if (remainingValue > 0) {
      payable(msg.sender).transfer(remainingValue);
    }
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

    nonces[author][app]++;

    bytes32 editHash = _getEditCommentHash(commentId, author, editData);

    // Verify the app signature.
    if (
      // In the case of direct contract calls, where `author == app == contract address`.
      msg.sender == app ||
      // or the app signs the edit hash
      SignatureChecker.isValidSignatureNow(app, editHash, appSignature)
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

    nonces[author][app]++;

    require(author != address(0), "Comment does not exist");

    bytes32 editHash = _getEditCommentHash(commentId, author, editData);

    // Verify the app signature.
    if (
      // skip app signature check if msg.sender is the app itself
      msg.sender != app &&
      !SignatureChecker.isValidSignatureNow(app, editHash, appSignature)
    ) {
      revert InvalidAppSignature();
    }

    // Verify the author signature.
    if (
      // consider authorized if the author has signed the comment hash
      SignatureChecker.isValidSignatureNow(author, editHash, authorSignature)
    ) {
      _editComment(
        commentId,
        editData,
        Comments.AuthorAuthMethod.AUTHOR_SIGNATURE,
        value
      );
      return;
    } else if (approvals[author][app] > block.timestamp) {
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
    Comments.Comment storage comment = comments[commentId];

    string memory content = editData.content;
    Metadata.MetadataEntry[] memory metadata = editData.metadata;
    uint88 timestampNow = uint88(block.timestamp);

    comment.content = content;
    comment.updatedAt = timestampNow;
    comment.authMethod = uint8(authMethod);

    // Clear existing metadata
    _clearCommentMetadata(commentId);

    // Store new metadata
    for (uint i = 0; i < metadata.length; i++) {
      bytes32 key = metadata[i].key;
      bytes memory val = metadata[i].value;

      commentMetadata[commentId][key] = val;
      commentMetadataKeys[commentId].push(key);

      emit CommentMetadataSet(commentId, key, val);
    }

    Channels.Channel memory channel = channelManager.getChannel(
      comment.channelId
    );

    // emit event before calling the `onCommentEdit` hook to ensure the order of events is correct in the case of reentrancy
    emit CommentEdited(
      commentId,
      editData.app,
      comment.author,
      comment.app,
      comment.channelId,
      comment.parentId,
      comment.createdAt,
      timestampNow,
      content,
      comment.targetUri,
      comment.commentType,
      comment.authMethod,
      metadata
    );

    if (channel.hook != address(0) && channel.permissions.onCommentEdit) {
      IHook hook = IHook(channel.hook);

      // Calculate hook value after protocol fee
      uint256 valueToPassToHook = channelManager
        .deductProtocolHookTransactionFee(value);
      if (value > valueToPassToHook) {
        payable(address(channelManager)).transfer(value - valueToPassToHook);
      }

      Metadata.MetadataEntry[] memory hookMetadata = hook.onCommentEdit{
        value: valueToPassToHook
      }(comment, metadata, msg.sender, commentId);

      // Clear existing hook metadata
      _clearCommentHookMetadata(commentId);

      // Store new hook metadata
      for (uint i = 0; i < hookMetadata.length; i++) {
        bytes32 key = hookMetadata[i].key;
        bytes memory val = hookMetadata[i].value;

        commentHookMetadata[commentId][key] = val;
        commentHookMetadataKeys[commentId].push(key);

        emit CommentHookMetadataSet(commentId, key, val);
      }
    } else if (value > 0) {
      // refund excess payment if any
      payable(msg.sender).transfer(value);
    }
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

    bytes32 deleteHash = getDeleteCommentHash(commentId, author, app, deadline);

    // for deleting comment, only single party (either author or app) is needed for authorization
    bool isAuthorizedByAuthor = (msg.sender == author ||
      SignatureChecker.isValidSignatureNow(
        author,
        deleteHash,
        authorSignature
      ));

    bool isAuthorizedByApprovedApp = approvals[author][app] > block.timestamp &&
      (msg.sender == app ||
        SignatureChecker.isValidSignatureNow(app, deleteHash, appSignature));

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
    Comments.Comment storage comment = comments[commentId];

    // Store comment data for hook
    Comments.Comment memory commentToDelete = comment;

    // Get metadata for hook
    Metadata.MetadataEntry[] memory metadata = _getCommentMetadata(commentId);
    Metadata.MetadataEntry[] memory hookMetadata = _getCommentHookMetadata(
      commentId
    );

    // Delete the comment and metadata
    delete comments[commentId];
    deleted[commentId] = true;
    _clearCommentMetadata(commentId);
    _clearCommentHookMetadata(commentId);

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
        metadata,
        hookMetadata,
        msg.sender,
        commentId
      );
    }
  }

  /// @notice Internal function to get metadata for a comment
  /// @param commentId The unique identifier of the comment
  /// @return The metadata entries for the comment
  function _getCommentMetadata(
    bytes32 commentId
  ) internal view returns (Metadata.MetadataEntry[] memory) {
    bytes32[] memory keys = commentMetadataKeys[commentId];
    Metadata.MetadataEntry[] memory metadata = new Metadata.MetadataEntry[](
      keys.length
    );

    for (uint i = 0; i < keys.length; i++) {
      metadata[i] = Metadata.MetadataEntry({
        key: keys[i],
        value: commentMetadata[commentId][keys[i]]
      });
    }

    return metadata;
  }

  /// @notice Internal function to get hook metadata for a comment
  /// @param commentId The unique identifier of the comment
  /// @return The hook metadata entries for the comment
  function _getCommentHookMetadata(
    bytes32 commentId
  ) internal view returns (Metadata.MetadataEntry[] memory) {
    bytes32[] memory keys = commentHookMetadataKeys[commentId];
    Metadata.MetadataEntry[] memory hookMetadata = new Metadata.MetadataEntry[](
      keys.length
    );

    for (uint i = 0; i < keys.length; i++) {
      hookMetadata[i] = Metadata.MetadataEntry({
        key: keys[i],
        value: commentHookMetadata[commentId][keys[i]]
      });
    }

    return hookMetadata;
  }

  /// @notice Internal function to clear all metadata for a comment
  /// @param commentId The unique identifier of the comment
  function _clearCommentMetadata(bytes32 commentId) internal {
    bytes32[] storage keys = commentMetadataKeys[commentId];
    for (uint i = 0; i < keys.length; i++) {
      delete commentMetadata[commentId][keys[i]];
    }
    delete commentMetadataKeys[commentId];
  }

  /// @notice Internal function to clear all hook metadata for a comment
  /// @param commentId The unique identifier of the comment
  function _clearCommentHookMetadata(bytes32 commentId) internal {
    bytes32[] storage keys = commentHookMetadataKeys[commentId];
    for (uint i = 0; i < keys.length; i++) {
      delete commentHookMetadata[commentId][keys[i]];
    }
    delete commentHookMetadataKeys[commentId];
  }

  /// @inheritdoc ICommentManager
  function addApproval(address app, uint256 expiry) external {
    _addApproval(msg.sender, app, expiry);
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
    nonces[author][app]++;

    bytes32 addApprovalHash = getAddApprovalHash(
      author,
      app,
      expiry,
      nonce,
      deadline
    );

    if (
      !SignatureChecker.isValidSignatureNow(
        author,
        addApprovalHash,
        authorSignature
      )
    ) {
      revert InvalidAuthorSignature();
    }

    _addApproval(author, app, expiry);
  }

  /// @inheritdoc ICommentManager
  function revokeApproval(address app) external {
    _revokeApproval(msg.sender, app);
  }

  /// @inheritdoc ICommentManager
  function removeApprovalWithSig(
    address author,
    address app,
    uint256 nonce,
    uint256 deadline,
    bytes calldata authorSignature
  ) external notStale(deadline) validateNonce(author, app, nonce) {
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
        authorSignature
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
    uint256 expiry,
    uint256 nonce,
    uint256 deadline
  ) public view returns (bytes32) {
    bytes32 structHash = keccak256(
      abi.encode(ADD_APPROVAL_TYPEHASH, author, app, expiry, nonce, deadline)
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
        _hashMetadataArray(editData.metadata),
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
        _hashMetadataArray(commentData.metadata),
        keccak256(bytes(commentData.targetUri)),
        commentData.commentType,
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

  /// @notice Internal function to hash metadata array for EIP-712
  /// @param metadata The metadata array to hash
  /// @return The hash of the metadata array
  function _hashMetadataArray(
    Metadata.MetadataEntry[] memory metadata
  ) internal pure returns (bytes32) {
    bytes32[] memory hashedEntries = new bytes32[](metadata.length);

    for (uint i = 0; i < metadata.length; i++) {
      hashedEntries[i] = keccak256(
        abi.encode(
          keccak256("MetadataEntry(bytes32 key,bytes value)"),
          metadata[i].key,
          keccak256(metadata[i].value)
        )
      );
    }

    return keccak256(abi.encodePacked(hashedEntries));
  }

  /// @notice Helper function to compute edit comment hash from memory struct
  /// @param commentId The unique identifier of the comment to edit
  /// @param author The address of the comment author
  /// @param editData The comment data struct containing content and metadata
  /// @return The computed hash
  function _getEditCommentHash(
    bytes32 commentId,
    address author,
    Comments.EditComment memory editData
  ) internal view returns (bytes32) {
    bytes32 structHash = keccak256(
      abi.encode(
        EDIT_COMMENT_TYPEHASH,
        commentId,
        keccak256(bytes(editData.content)),
        _hashMetadataArray(editData.metadata),
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
    bytes32[] memory keys = commentMetadataKeys[commentId];
    Metadata.MetadataEntry[] memory metadata = new Metadata.MetadataEntry[](
      keys.length
    );

    for (uint i = 0; i < keys.length; i++) {
      metadata[i] = Metadata.MetadataEntry({
        key: keys[i],
        value: commentMetadata[commentId][keys[i]]
      });
    }

    return metadata;
  }

  /// @inheritdoc ICommentManager
  function getCommentHookMetadata(
    bytes32 commentId
  ) external view returns (Metadata.MetadataEntry[] memory) {
    bytes32[] memory keys = commentHookMetadataKeys[commentId];
    Metadata.MetadataEntry[] memory hookMetadata = new Metadata.MetadataEntry[](
      keys.length
    );

    for (uint i = 0; i < keys.length; i++) {
      hookMetadata[i] = Metadata.MetadataEntry({
        key: keys[i],
        value: commentHookMetadata[commentId][keys[i]]
      });
    }

    return hookMetadata;
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
    return approvals[author][app] > block.timestamp;
  }

  /// @inheritdoc ICommentManager
  function getApprovalExpiry(
    address author,
    address app
  ) external view returns (uint256) {
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
    if (nonces[author][app] != nonce) {
      revert InvalidNonce(author, app, nonces[author][app], nonce);
    }

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
    _updateCommentHookData(commentId);
  }

  /// @notice Internal function to update hook metadata using merge mode for gas efficiency
  /// @param commentId The unique identifier of the comment to update
  function _updateCommentHookData(bytes32 commentId) internal {
    Comments.Comment storage comment = comments[commentId];

    Channels.Channel memory channel = channelManager.getChannel(
      comment.channelId
    );
    if (
      channel.hook == address(0) || !channel.permissions.onCommentHookDataUpdate
    ) {
      revert HookNotEnabled();
    }

    // Get current metadata for hook
    Metadata.MetadataEntry[] memory metadata = _getCommentMetadata(commentId);
    Metadata.MetadataEntry[] memory hookMetadata = _getCommentHookMetadata(
      commentId
    );

    IHook hook = IHook(channel.hook);

    Metadata.MetadataEntryOp[] memory operations = hook.onCommentHookDataUpdate(
      comment,
      metadata,
      hookMetadata,
      msg.sender,
      commentId
    );

    // Apply hook metadata operations using merge mode (gas-efficient)
    _applyHookMetadataOperations(commentId, operations);
  }

  /// @notice Internal function to apply hook metadata operations efficiently
  /// @param commentId The unique identifier of the comment
  /// @param operations The metadata operations to apply
  function _applyHookMetadataOperations(
    bytes32 commentId,
    Metadata.MetadataEntryOp[] memory operations
  ) internal {
    for (uint i = 0; i < operations.length; i++) {
      Metadata.MetadataEntryOp memory op = operations[i];

      if (op.operation == Metadata.MetadataOperation.DELETE) {
        _deleteCommentHookMetadataKey(commentId, op.key);
        emit CommentHookMetadataSet(commentId, op.key, ""); // Emit empty value for deletion
      } else if (op.operation == Metadata.MetadataOperation.SET) {
        // Check if this is a new key for gas optimization
        bool isNewKey = !_hookMetadataKeyExists(commentId, op.key);

        commentHookMetadata[commentId][op.key] = op.value;

        // Only add to keys array if it's a new key
        if (isNewKey) {
          commentHookMetadataKeys[commentId].push(op.key);
        }

        emit CommentHookMetadataSet(commentId, op.key, op.value);
      }
    }
  }

  /// @notice Internal function to delete a specific hook metadata key
  /// @param commentId The unique identifier of the comment
  /// @param keyToDelete The key to delete
  function _deleteCommentHookMetadataKey(
    bytes32 commentId,
    bytes32 keyToDelete
  ) internal {
    // Delete the value
    delete commentHookMetadata[commentId][keyToDelete];

    // Remove from keys array
    bytes32[] storage keys = commentHookMetadataKeys[commentId];
    for (uint i = 0; i < keys.length; i++) {
      if (keys[i] == keyToDelete) {
        // Move last element to current position and pop
        keys[i] = keys[keys.length - 1];
        keys.pop();
        break;
      }
    }
  }

  /// @notice Internal function to check if a hook metadata key exists
  /// @param commentId The unique identifier of the comment
  /// @param targetKey The key to check for existence
  /// @return exists Whether the key exists in the metadata
  function _hookMetadataKeyExists(
    bytes32 commentId,
    bytes32 targetKey
  ) internal view returns (bool exists) {
    bytes32[] storage keys = commentHookMetadataKeys[commentId];
    for (uint i = 0; i < keys.length; i++) {
      if (keys[i] == targetKey) {
        return true;
      }
    }
    return false;
  }

  /// @notice Internal function to add an app signer approval
  /// @param author The address granting approval
  /// @param app The address being approved
  /// @param expiry The timestamp when the approval expires
  function _addApproval(address author, address app, uint256 expiry) internal {
    if (expiry <= block.timestamp) revert InvalidApprovalExpiry();
    approvals[author][app] = expiry;
    emit ApprovalAdded(author, app, expiry);
  }

  /// @notice Internal function to remove an app signer approval
  /// @param author The address removing approval
  /// @param app The address being unapproved
  function _revokeApproval(address author, address app) internal {
    approvals[author][app] = 0;
    emit ApprovalRemoved(author, app);
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

  error InvalidReactionReference(string reason);

  // ============ BATCH OPERATIONS ============

  /// @inheritdoc ICommentManager
  function batchOperations(
    Comments.BatchOperation[] calldata operations
  ) external payable nonReentrant returns (bytes[] memory results) {
    if (operations.length == 0) {
      revert InvalidBatchOperation(0, "Empty operations array");
    }

    // Validate total value distribution
    uint256 totalRequiredValue = 0;
    for (uint i = 0; i < operations.length; i++) {
      totalRequiredValue += operations[i].value;
    }

    if (msg.value != totalRequiredValue) {
      revert InvalidValueDistribution(msg.value, totalRequiredValue);
    }

    results = new bytes[](operations.length);

    // Execute operations in order
    for (uint i = 0; i < operations.length; i++) {
      results[i] = _executeBatchOperation(operations[i], i);
    }

    emit BatchOperationExecuted(msg.sender, operations.length, msg.value);

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
    Comments.CreateComment memory commentData = abi.decode(
      operation.data,
      (Comments.CreateComment)
    );

    if (operation.signatures.length != 1) {
      revert InvalidBatchOperation(
        operationIndex,
        "POST_COMMENT requires exactly 1 signature"
      );
    }

    // Call internal postComment function with allocated value
    bytes32 commentId = _postComment(
      commentData,
      operation.signatures[0], // app signature
      operation.value
    );

    return abi.encode(commentId);
  }

  function _executePostCommentWithSigBatch(
    Comments.BatchOperation calldata operation,
    uint256 operationIndex
  ) internal returns (bytes memory) {
    Comments.CreateComment memory commentData = abi.decode(
      operation.data,
      (Comments.CreateComment)
    );

    if (operation.signatures.length != 2) {
      revert InvalidBatchOperation(
        operationIndex,
        "POST_COMMENT_WITH_SIG requires exactly 2 signatures"
      );
    }

    // Call postCommentWithSig function directly
    bytes32 commentId = _postCommentWithSig(
      commentData,
      operation.signatures[0], // author signature
      operation.signatures[1], // app signature
      operation.value
    );

    return abi.encode(commentId);
  }

  function _executeEditCommentBatch(
    Comments.BatchOperation calldata operation,
    uint256 operationIndex
  ) internal returns (bytes memory) {
    (bytes32 commentId, Comments.EditComment memory editData) = abi.decode(
      operation.data,
      (bytes32, Comments.EditComment)
    );

    if (operation.signatures.length != 1) {
      revert InvalidBatchOperation(
        operationIndex,
        "EDIT_COMMENT requires exactly 1 signature"
      );
    }

    // Call internal editComment function with allocated value
    _editCommentDirect(
      commentId,
      editData,
      operation.signatures[0], // app signature
      operation.value
    );

    return "";
  }

  function _executeEditCommentWithSigBatch(
    Comments.BatchOperation calldata operation,
    uint256 operationIndex
  ) internal returns (bytes memory) {
    (bytes32 commentId, Comments.EditComment memory editData) = abi.decode(
      operation.data,
      (bytes32, Comments.EditComment)
    );

    if (operation.signatures.length != 2) {
      revert InvalidBatchOperation(
        operationIndex,
        "EDIT_COMMENT_WITH_SIG requires exactly 2 signatures"
      );
    }

    // Call editCommentWithSig internal function with allocated value
    _editCommentWithSig(
      commentId,
      editData,
      operation.signatures[0], // author signature
      operation.signatures[1], // app signature
      operation.value
    );

    return "";
  }

  function _executeDeleteCommentBatch(
    Comments.BatchOperation calldata operation,
    uint256 operationIndex
  ) internal returns (bytes memory) {
    bytes32 commentId = abi.decode(operation.data, (bytes32));

    if (operation.signatures.length != 0) {
      revert InvalidBatchOperation(
        operationIndex,
        "DELETE_COMMENT requires no signatures"
      );
    }

    // Call deleteComment function directly (preserves msg.sender)
    deleteComment(commentId);

    return "";
  }

  function _executeDeleteCommentWithSigBatch(
    Comments.BatchOperation calldata operation,
    uint256 operationIndex
  ) internal returns (bytes memory) {
    Comments.BatchDeleteData memory deleteData = abi.decode(
      operation.data,
      (Comments.BatchDeleteData)
    );

    if (operation.signatures.length != 2) {
      revert InvalidBatchOperation(
        operationIndex,
        "DELETE_COMMENT_WITH_SIG requires exactly 2 signatures"
      );
    }

    // Call deleteCommentWithSig function directly
    deleteCommentWithSig(
      deleteData.commentId,
      deleteData.app,
      deleteData.deadline,
      operation.signatures[0], // author signature
      operation.signatures[1] // app signature
    );

    return "";
  }
}
