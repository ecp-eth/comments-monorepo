##### @ecp.eth/protocol

----

# `BaseHook`

Abstract base contract for all hook implementations


Provides default implementations that throw HookNotImplemented if not overridden







## Functions

### supportsInterface(bytes4 interfaceId) → bool (public)

Checks if the contract implements the specified interface




### getHookPermissions() → [struct Hooks.Permissions](/protocol-reference/libraries/Hooks#permissions) (external)





### _getHookPermissions() → [struct Hooks.Permissions](/protocol-reference/libraries/Hooks#permissions) (internal)





### onInitialize(address channel, [struct Channels.Channel](/protocol-reference/libraries/Channels#channel) channelData, uint256 channelId) → bool (external)

Execute after a hook is initialized on a channel




### _onInitialize(address, [struct Channels.Channel](/protocol-reference/libraries/Channels#channel), uint256) → bool (internal)





### onCommentAdd([struct Comments.Comment](/protocol-reference/libraries/Comments#comment) commentData, [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry) metadata, address msgSender, bytes32 commentId) → [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry) (external)

Execute after a comment is processed




### _onCommentAdd([struct Comments.Comment](/protocol-reference/libraries/Comments#comment), [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry), address, bytes32) → [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry) (internal)





### onCommentDelete([struct Comments.Comment](/protocol-reference/libraries/Comments#comment) commentData, [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry) metadata, [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry) hookMetadata, address msgSender, bytes32 commentId) → bool (external)

Execute after a comment is deleted




### _onCommentDelete([struct Comments.Comment](/protocol-reference/libraries/Comments#comment), [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry), [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry), address, bytes32) → bool (internal)





### onCommentEdit([struct Comments.Comment](/protocol-reference/libraries/Comments#comment) commentData, [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry) metadata, address msgSender, bytes32 commentId) → [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry) (external)

Execute after a comment is edited




### _onCommentEdit([struct Comments.Comment](/protocol-reference/libraries/Comments#comment), [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry), address, bytes32) → [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry) (internal)





### onChannelUpdate(address channel, uint256 channelId, [struct Channels.Channel](/protocol-reference/libraries/Channels#channel) channelData, [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry) metadata) → bool (external)

Execute after a channel is updated




### _onChannelUpdate(address, uint256, [struct Channels.Channel](/protocol-reference/libraries/Channels#channel), [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry)) → bool (internal)





### onCommentHookDataUpdate([struct Comments.Comment](/protocol-reference/libraries/Comments#comment) commentData, [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry) metadata, [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry) hookMetadata, address msgSender, bytes32 commentId) → [struct Metadata.MetadataEntryOp[]](/protocol-reference/libraries/Metadata#metadataentryop) (external)

Execute to update hook data for an existing comment




### _onCommentHookDataUpdate([struct Comments.Comment](/protocol-reference/libraries/Comments#comment), [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry), [struct Metadata.MetadataEntry[]](/protocol-reference/libraries/Metadata#metadataentry), address, bytes32) → [struct Metadata.MetadataEntryOp[]](/protocol-reference/libraries/Metadata#metadataentryop) (internal)







