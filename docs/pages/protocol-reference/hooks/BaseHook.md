##### @ecp.eth/protocol

----

# `BaseHook`

Abstract base contract for all hook implementations


Provides default implementations that throw HookNotImplemented if not overridden







## Functions

### `supportsInterface(bytes4 interfaceId) → bool` (public)

Checks if the contract implements the specified interface




### `getHookPermissions() → struct Hooks.Permissions` (external)





### `_getHookPermissions() → struct Hooks.Permissions` (internal)





### `onInitialize(address channel, struct Channels.Channel channelData, uint256 channelId) → bool` (external)

Execute after a hook is initialized on a channel




### `_onInitialize(address, struct Channels.Channel, uint256) → bool` (internal)





### `onCommentAdd(struct Comments.Comment commentData, struct Comments.MetadataEntry[] metadata, address msgSender, bytes32 commentId) → struct Comments.MetadataEntry[]` (external)

Execute after a comment is processed




### `_onCommentAdd(struct Comments.Comment, struct Comments.MetadataEntry[], address, bytes32) → struct Comments.MetadataEntry[]` (internal)





### `onCommentDelete(struct Comments.Comment commentData, struct Comments.MetadataEntry[] metadata, struct Comments.MetadataEntry[] hookMetadata, address msgSender, bytes32 commentId) → bool` (external)

Execute after a comment is deleted




### `_onCommentDelete(struct Comments.Comment, struct Comments.MetadataEntry[], struct Comments.MetadataEntry[], address, bytes32) → bool` (internal)





### `onCommentEdit(struct Comments.Comment commentData, struct Comments.MetadataEntry[] metadata, address msgSender, bytes32 commentId) → struct Comments.MetadataEntry[]` (external)

Execute after a comment is edited




### `_onCommentEdit(struct Comments.Comment, struct Comments.MetadataEntry[], address, bytes32) → struct Comments.MetadataEntry[]` (internal)





### `onChannelUpdate(address channel, uint256 channelId, struct Channels.Channel channelData) → bool` (external)

Execute after a channel is updated




### `_onChannelUpdate(address, uint256, struct Channels.Channel) → bool` (internal)







