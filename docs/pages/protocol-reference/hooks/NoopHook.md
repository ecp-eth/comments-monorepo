##### @ecp.eth/protocol

----

# `NoopHook`











## Functions

### supportsInterface(bytes4 interfaceId) → bool (external)





### getHookPermissions() → [struct Hooks.Permissions](/protocol-reference/types/Hooks#permissions) (external)





### onCommentAdd([struct Comments.Comment](/protocol-reference/types/Comments#comment), [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry), address, bytes32) → [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) (external)





### onInitialize(address, [struct Channels.Channel](/protocol-reference/types/Channels#channel), uint256, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry)) → bool (external)





### onCommentDelete([struct Comments.Comment](/protocol-reference/types/Comments#comment), [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry), [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry), address, bytes32) → bool (external)





### onCommentEdit([struct Comments.Comment](/protocol-reference/types/Comments#comment), [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry), address, bytes32) → [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) (external)





### onChannelUpdate(address, uint256, [struct Channels.Channel](/protocol-reference/types/Channels#channel), [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry)) → bool (external)





### onCommentHookDataUpdate([struct Comments.Comment](/protocol-reference/types/Comments#comment), [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry), [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry), address, bytes32) → [struct Metadata.MetadataEntryOp[]](/protocol-reference/types/Metadata#metadataentryop) (external)







