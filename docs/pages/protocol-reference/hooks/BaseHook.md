##### @ecp.eth/protocol

----

# `BaseHook`

Abstract base contract for all hook implementations


Provides default implementations that throw HookNotImplemented if not overridden







## Functions

### supportsInterface(bytes4 interfaceId) → bool (public)

Checks if the contract implements the specified interface




### getHookPermissions() → [struct Hooks.Permissions](/protocol-reference/types/Hooks#permissions) (external)





### _getHookPermissions() → [struct Hooks.Permissions](/protocol-reference/types/Hooks#permissions) (internal)





### onInitialize(address channelManager, [struct Channels.Channel](/protocol-reference/types/Channels#channel) channelData, uint256 channelId, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata) → bool (external)

Execute after a hook is initialized on a channel




### _onInitialize(address, [struct Channels.Channel](/protocol-reference/types/Channels#channel), uint256, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry)) → bool (internal)





### onCommentAdd([struct Comments.Comment](/protocol-reference/types/Comments#comment) commentData, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata, address msgSender, bytes32 commentId) → [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) (external)

Execute after a comment is processed




### _onCommentAdd([struct Comments.Comment](/protocol-reference/types/Comments#comment), [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry), address, bytes32) → [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) (internal)





### onCommentDelete([struct Comments.Comment](/protocol-reference/types/Comments#comment) commentData, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) hookMetadata, address msgSender, bytes32 commentId) → bool (external)

Execute after a comment is deleted




### _onCommentDelete([struct Comments.Comment](/protocol-reference/types/Comments#comment), [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry), [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry), address, bytes32) → bool (internal)





### onCommentEdit([struct Comments.Comment](/protocol-reference/types/Comments#comment) commentData, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata, address msgSender, bytes32 commentId) → [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) (external)

Execute after a comment is edited




### _onCommentEdit([struct Comments.Comment](/protocol-reference/types/Comments#comment), [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry), address, bytes32) → [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) (internal)





### onChannelUpdate(address channel, uint256 channelId, [struct Channels.Channel](/protocol-reference/types/Channels#channel) channelData, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata) → bool (external)

Execute after a channel is updated




### _onChannelUpdate(address, uint256, [struct Channels.Channel](/protocol-reference/types/Channels#channel), [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry)) → bool (internal)





### onCommentHookDataUpdate([struct Comments.Comment](/protocol-reference/types/Comments#comment) commentData, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) hookMetadata, address msgSender, bytes32 commentId) → [struct Metadata.MetadataEntryOp[]](/protocol-reference/types/Metadata#metadataentryop) (external)

Execute to update hook data for an existing comment




### _onCommentHookDataUpdate([struct Comments.Comment](/protocol-reference/types/Comments#comment), [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry), [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry), address, bytes32) → [struct Metadata.MetadataEntryOp[]](/protocol-reference/types/Metadata#metadataentryop) (internal)







