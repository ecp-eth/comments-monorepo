##### @ecp.eth/protocol

----

# `IHook`











## Functions

### `getHookPermissions() → struct Hooks.Permissions` (external)





### `onInitialize(address channel, struct Channels.Channel channelData, uint256 channelId) → bool success` (external)

Execute after a hook is initialized on a channel




### `onCommentAdd(struct Comments.Comment commentData, struct Comments.MetadataEntry[] metadata, address msgSender, bytes32 commentId) → struct Comments.MetadataEntry[] hookMetadata` (external)

Execute after a comment is processed




### `onCommentDelete(struct Comments.Comment commentData, struct Comments.MetadataEntry[] metadata, struct Comments.MetadataEntry[] hookMetadata, address msgSender, bytes32 commentId) → bool success` (external)

Execute after a comment is deleted




### `onCommentEdit(struct Comments.Comment commentData, struct Comments.MetadataEntry[] metadata, address msgSender, bytes32 commentId) → struct Comments.MetadataEntry[] hookMetadata` (external)

Execute after a comment is edited




### `onChannelUpdate(address channel, uint256 channelId, struct Channels.Channel channelData) → bool success` (external)

Execute after a channel is updated






