##### @ecp.eth/protocol

----

# `IHook`











## Functions

### getHookPermissions() → [struct Hooks.Permissions](/protocol-reference/types/Hooks#permissions) (external)





### onInitialize(address channel, [struct Channels.Channel](/protocol-reference/types/Channels#channel) channelData, uint256 channelId) → bool success (external)

Execute after a hook is initialized on a channel




### onCommentAdd([struct Comments.Comment](/protocol-reference/types/Comments#comment) commentData, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata, address msgSender, bytes32 commentId) → [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) hookMetadata (external)

Execute after a comment is processed




### onCommentDelete([struct Comments.Comment](/protocol-reference/types/Comments#comment) commentData, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) hookMetadata, address msgSender, bytes32 commentId) → bool success (external)

Execute after a comment is deleted




### onCommentEdit([struct Comments.Comment](/protocol-reference/types/Comments#comment) commentData, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata, address msgSender, bytes32 commentId) → [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) hookMetadata (external)

Execute after a comment is edited




### onChannelUpdate(address channel, uint256 channelId, [struct Channels.Channel](/protocol-reference/types/Channels#channel) channelData, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata) → bool success (external)

Execute after a channel is updated




### onCommentHookDataUpdate([struct Comments.Comment](/protocol-reference/types/Comments#comment) commentData, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) hookMetadata, address msgSender, bytes32 commentId) → [struct Metadata.MetadataEntryOp[]](/protocol-reference/types/Metadata#metadataentryop) operations (external)

Execute to update hook data for an existing comment






