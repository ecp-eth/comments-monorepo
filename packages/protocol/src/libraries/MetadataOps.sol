// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ICommentManager.sol";
import "../types/Metadata.sol";

/// @title MetadataOps - Library for metadata operations for comments and channels
library MetadataOps {
  /// @notice Get metadata for a comment
  /// @param commentId The unique identifier of the comment
  /// @param commentMetadata Mapping of comment ID to metadata key to metadata value
  /// @param commentMetadataKeys Mapping of comment ID to array of metadata keys
  /// @return The metadata entries for the comment
  function getCommentMetadata(
    bytes32 commentId,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentMetadata,
    mapping(bytes32 => bytes32[]) storage commentMetadataKeys
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

  /// @notice Get hook metadata for a comment
  /// @param commentId The unique identifier of the comment
  /// @param commentHookMetadata Mapping of comment ID to hook metadata key to hook metadata value
  /// @param commentHookMetadataKeys Mapping of comment ID to array of hook metadata keys
  /// @return The hook metadata entries for the comment
  function getCommentHookMetadata(
    bytes32 commentId,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentHookMetadata,
    mapping(bytes32 => bytes32[]) storage commentHookMetadataKeys
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

  /// @notice Clear all metadata for a comment
  /// @param commentId The unique identifier of the comment
  /// @param commentMetadata Mapping of comment ID to metadata key to metadata value
  /// @param commentMetadataKeys Mapping of comment ID to array of metadata keys
  function clearCommentMetadata(
    bytes32 commentId,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentMetadata,
    mapping(bytes32 => bytes32[]) storage commentMetadataKeys
  ) external {
    bytes32[] storage keys = commentMetadataKeys[commentId];
    for (uint i = 0; i < keys.length; i++) {
      delete commentMetadata[commentId][keys[i]];
    }
    delete commentMetadataKeys[commentId];
  }

  /// @notice Clear all hook metadata for a comment
  /// @param commentId The unique identifier of the comment
  /// @param commentHookMetadata Mapping of comment ID to hook metadata key to hook metadata value
  /// @param commentHookMetadataKeys Mapping of comment ID to array of hook metadata keys
  function clearCommentHookMetadata(
    bytes32 commentId,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentHookMetadata,
    mapping(bytes32 => bytes32[]) storage commentHookMetadataKeys
  ) external {
    bytes32[] storage keys = commentHookMetadataKeys[commentId];
    for (uint i = 0; i < keys.length; i++) {
      delete commentHookMetadata[commentId][keys[i]];
    }
    delete commentHookMetadataKeys[commentId];
  }

  /// @notice Apply hook metadata operations efficiently
  /// @param commentId The unique identifier of the comment
  /// @param operations The metadata operations to apply
  /// @param commentHookMetadata Mapping of comment ID to hook metadata key to hook metadata value
  /// @param commentHookMetadataKeys Mapping of comment ID to array of hook metadata keys
  function applyHookMetadataOperations(
    bytes32 commentId,
    Metadata.MetadataEntryOp[] memory operations,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentHookMetadata,
    mapping(bytes32 => bytes32[]) storage commentHookMetadataKeys
  ) external {
    for (uint i = 0; i < operations.length; i++) {
      Metadata.MetadataEntryOp memory op = operations[i];

      if (op.operation == Metadata.MetadataOperation.DELETE) {
        _deleteCommentHookMetadataKey(
          commentId,
          op.key,
          commentHookMetadata,
          commentHookMetadataKeys
        );
      } else if (op.operation == Metadata.MetadataOperation.SET) {
        // Check if this is a new key for gas optimization
        bool isNewKey = !_hookMetadataKeyExists(
          commentId,
          op.key,
          commentHookMetadataKeys
        );

        commentHookMetadata[commentId][op.key] = op.value;

        // Only add to keys array if it's a new key
        if (isNewKey) {
          commentHookMetadataKeys[commentId].push(op.key);
        }
      }
    }
  }

  /// @notice Delete a specific hook metadata key
  /// @param commentId The unique identifier of the comment
  /// @param keyToDelete The key to delete
  /// @param commentHookMetadata Mapping of comment ID to hook metadata key to hook metadata value
  /// @param commentHookMetadataKeys Mapping of comment ID to array of hook metadata keys
  function deleteCommentHookMetadataKey(
    bytes32 commentId,
    bytes32 keyToDelete,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentHookMetadata,
    mapping(bytes32 => bytes32[]) storage commentHookMetadataKeys
  ) external {
    _deleteCommentHookMetadataKey(
      commentId,
      keyToDelete,
      commentHookMetadata,
      commentHookMetadataKeys
    );
  }

  /// @notice Internal function to delete a specific hook metadata key
  /// @param commentId The unique identifier of the comment
  /// @param keyToDelete The key to delete
  /// @param commentHookMetadata Mapping of comment ID to hook metadata key to hook metadata value
  /// @param commentHookMetadataKeys Mapping of comment ID to array of hook metadata keys
  function _deleteCommentHookMetadataKey(
    bytes32 commentId,
    bytes32 keyToDelete,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentHookMetadata,
    mapping(bytes32 => bytes32[]) storage commentHookMetadataKeys
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

  /// @notice Check if a hook metadata key exists
  /// @param commentId The unique identifier of the comment
  /// @param targetKey The key to check for existence
  /// @param commentHookMetadataKeys Mapping of comment ID to array of hook metadata keys
  /// @return exists Whether the key exists in the metadata
  function hookMetadataKeyExists(
    bytes32 commentId,
    bytes32 targetKey,
    mapping(bytes32 => bytes32[]) storage commentHookMetadataKeys
  ) external view returns (bool exists) {
    return
      _hookMetadataKeyExists(commentId, targetKey, commentHookMetadataKeys);
  }

  /// @notice Internal function to check if a hook metadata key exists
  /// @param commentId The unique identifier of the comment
  /// @param targetKey The key to check for existence
  /// @param commentHookMetadataKeys Mapping of comment ID to array of hook metadata keys
  /// @return exists Whether the key exists in the metadata
  function _hookMetadataKeyExists(
    bytes32 commentId,
    bytes32 targetKey,
    mapping(bytes32 => bytes32[]) storage commentHookMetadataKeys
  ) internal view returns (bool exists) {
    bytes32[] storage keys = commentHookMetadataKeys[commentId];
    for (uint i = 0; i < keys.length; i++) {
      if (keys[i] == targetKey) {
        return true;
      }
    }
    return false;
  }

  /// @notice Store metadata entries for a comment
  /// @param commentId The unique identifier of the comment
  /// @param metadata Array of metadata entries to store
  /// @param commentMetadata Mapping of comment ID to metadata key to metadata value
  /// @param commentMetadataKeys Mapping of comment ID to array of metadata keys
  function storeCommentMetadata(
    bytes32 commentId,
    Metadata.MetadataEntry[] memory metadata,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentMetadata,
    mapping(bytes32 => bytes32[]) storage commentMetadataKeys
  ) external {
    for (uint i = 0; i < metadata.length; i++) {
      bytes32 key = metadata[i].key;
      bytes memory val = metadata[i].value;

      commentMetadata[commentId][key] = val;
      commentMetadataKeys[commentId].push(key);
    }
  }

  /// @notice Store hook metadata entries for a comment
  /// @param commentId The unique identifier of the comment
  /// @param hookMetadata Array of hook metadata entries to store
  /// @param commentHookMetadata Mapping of comment ID to hook metadata key to hook metadata value
  /// @param commentHookMetadataKeys Mapping of comment ID to array of hook metadata keys
  function storeCommentHookMetadata(
    bytes32 commentId,
    Metadata.MetadataEntry[] memory hookMetadata,
    mapping(bytes32 => mapping(bytes32 => bytes)) storage commentHookMetadata,
    mapping(bytes32 => bytes32[]) storage commentHookMetadataKeys
  ) external {
    mapping(bytes32 => bytes)
      storage commentHookMetadataForId = commentHookMetadata[commentId];
    bytes32[] storage commentHookMetadataKeysForId = commentHookMetadataKeys[
      commentId
    ];
    for (uint i = 0; i < hookMetadata.length; i++) {
      bytes32 key = hookMetadata[i].key;
      bytes memory val = hookMetadata[i].value;

      commentHookMetadataForId[key] = val;
      commentHookMetadataKeysForId.push(key);

      emit ICommentManager.CommentHookMetadataSet(commentId, key, val);
    }
  }
}
