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





### `onInitialized(address channel, uint256 channelId) → bool` (external)

Execute after a hook is initialized on a channel




### `_onInitialized(address, uint256) → bool` (internal)





### `onCommentAdded(struct Comments.Comment commentData, address caller, bytes32 commentId) → string` (external)

Execute after a comment is processed




### `_onCommentAdded(struct Comments.Comment, address, bytes32) → string` (internal)





### `onCommentDeleted(struct Comments.Comment commentData, address caller, bytes32 commentId) → bool` (external)

Execute after a comment is deleted




### `_onCommentDeleted(struct Comments.Comment, address, bytes32) → bool` (internal)





### `onCommentEdited(struct Comments.Comment commentData, address caller, bytes32 commentId) → string` (external)

Execute after a comment is edited




### `_onCommentEdited(struct Comments.Comment, address, bytes32) → string` (internal)





### `onChannelUpdated(address channel, uint256 channelId, struct Channels.Channel channelData) → bool` (external)

Execute after a channel is updated




### `_onChannelUpdated(address, uint256, struct Channels.Channel) → bool` (internal)







