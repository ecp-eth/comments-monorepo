##### @ecp.eth/protocol

----

# `NoopHook`











## Functions

### supportsInterface(bytes4 interfaceId) → bool (external)





### getHookPermissions() → [struct Hooks.Permissions](/protocol-reference/libraries/Hooks#permissions) (external)





### onCommentAdd([struct Comments.Comment](/protocol-reference/libraries/Comments#comment), [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry), address, bytes32) → [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry) (external)





### onInitialize(address, [struct Channels.Channel](/protocol-reference/libraries/Channels#channel), uint256) → bool (external)





### onCommentDelete([struct Comments.Comment](/protocol-reference/libraries/Comments#comment), [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry), [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry), address, bytes32) → bool (external)





### onCommentEdit([struct Comments.Comment](/protocol-reference/libraries/Comments#comment), [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry), address, bytes32) → [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry) (external)





### onChannelUpdate(address, uint256, [struct Channels.Channel](/protocol-reference/libraries/Channels#channel), [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry)) → bool (external)





### onCommentHookDataUpdate([struct Comments.Comment](/protocol-reference/libraries/Comments#comment), [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry), [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry), address, bytes32) → [struct Metadata.MetadataEntryOp[]](/protocol-reference/libraries/Metadata#metadataentryop) (external)







