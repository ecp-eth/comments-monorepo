// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Metadata - Library defining shared metadata types for comments and channels
library Metadata {
  /// @notice Struct containing metadata key-value pair
  /// @param key UTF-8 encoded string of format "type key". Must fit in 32 bytes.
  /// @param value The metadata value as bytes
  struct MetadataEntry {
    bytes32 key;
    bytes value;
  }

  /// @notice Enum for metadata operations in hook updates
  enum MetadataOperation {
    SET, // Set or update the metadata value
    DELETE // Delete the metadata key
  }

  /// @notice Struct for hook metadata operations with explicit operation type
  /// @param operation The operation to perform (SET or DELETE)
  /// @param key The metadata key
  /// @param value The metadata value (ignored for DELETE operations)
  struct HookMetadataUpdate {
    MetadataOperation operation;
    bytes32 key;
    bytes value;
  }
}
