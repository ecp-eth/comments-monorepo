##### @ecp.eth/protocol

----

# `IHook`











## Functions

### `getHookPermissions() → struct Hooks.Permissions` (external)





### `onInitialized(address channel, uint256 channelId) → bool success` (external)

Execute after a hook is initialized on a channel




### `onCommentAdded(struct Comments.Comment commentData, address msgSender, bytes32 commentId) → string hookData` (external)

Execute after a comment is processed




### `onCommentDeleted(struct Comments.Comment commentData, address msgSender, bytes32 commentId) → bool success` (external)

Execute after a comment is deleted




### `onCommentEdited(struct Comments.Comment commentData, address msgSender, bytes32 commentId) → string commentHookData` (external)

Execute after a comment is edited




### `onChannelUpdated(address channel, uint256 channelId, struct Channels.Channel channelData) → bool success` (external)

Execute after a channel is updated






