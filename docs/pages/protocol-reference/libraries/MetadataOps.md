##### @ecp.eth/protocol

----

# `MetadataOps`











## Functions

### getCommentMetadata(bytes32 commentId, mapping(bytes32 => mapping(bytes32 => bytes)) commentMetadata, mapping(bytes32 => bytes32[]) commentMetadataKeys) → [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) (external)

Get metadata for a comment




### getCommentHookMetadata(bytes32 commentId, mapping(bytes32 => mapping(bytes32 => bytes)) commentHookMetadata, mapping(bytes32 => bytes32[]) commentHookMetadataKeys) → [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) (external)

Get hook metadata for a comment




### clearCommentMetadata(bytes32 commentId, mapping(bytes32 => mapping(bytes32 => bytes)) commentMetadata, mapping(bytes32 => bytes32[]) commentMetadataKeys) (external)

Clear all metadata for a comment




### clearCommentHookMetadata(bytes32 commentId, mapping(bytes32 => mapping(bytes32 => bytes)) commentHookMetadata, mapping(bytes32 => bytes32[]) commentHookMetadataKeys) (external)

Clear all hook metadata for a comment




### applyHookMetadataOperations(bytes32 commentId, [struct Metadata.MetadataEntryOp[]](/protocol-reference/types/Metadata#metadataentryop) operations, mapping(bytes32 => mapping(bytes32 => bytes)) commentHookMetadata, mapping(bytes32 => bytes32[]) commentHookMetadataKeys) (external)

Apply hook metadata operations efficiently




### deleteCommentHookMetadataKey(bytes32 commentId, bytes32 keyToDelete, mapping(bytes32 => mapping(bytes32 => bytes)) commentHookMetadata, mapping(bytes32 => bytes32[]) commentHookMetadataKeys) (external)

Delete a specific hook metadata key




### _deleteCommentHookMetadataKey(bytes32 commentId, bytes32 keyToDelete, mapping(bytes32 => mapping(bytes32 => bytes)) commentHookMetadata, mapping(bytes32 => bytes32[]) commentHookMetadataKeys) (internal)

Internal function to delete a specific hook metadata key




### hookMetadataKeyExists(bytes32 commentId, bytes32 targetKey, mapping(bytes32 => bytes32[]) commentHookMetadataKeys) → bool exists (external)

Check if a hook metadata key exists




### _hookMetadataKeyExists(bytes32 commentId, bytes32 targetKey, mapping(bytes32 => bytes32[]) commentHookMetadataKeys) → bool exists (internal)

Internal function to check if a hook metadata key exists




### storeCommentMetadata(bytes32 commentId, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata, mapping(bytes32 => mapping(bytes32 => bytes)) commentMetadata, mapping(bytes32 => bytes32[]) commentMetadataKeys) (external)

Store metadata entries for a comment




### storeCommentHookMetadata(bytes32 commentId, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) hookMetadata, mapping(bytes32 => mapping(bytes32 => bytes)) commentHookMetadata, mapping(bytes32 => bytes32[]) commentHookMetadataKeys) (external)

Store hook metadata entries for a comment






