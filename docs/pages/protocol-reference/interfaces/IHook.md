##### @ecp.eth/protocol

----

# `IHook`











## Functions

### `getHookPermissions() → struct Hooks.Permissions` (external)





### `afterInitialize(address channel) → bool success` (external)

Execute after a hook is initialized on a channel




### `afterComment(struct Comments.Comment commentData, address caller, bytes32 commentId) → string hookData` (external)

Execute after a comment is processed




### `afterDeleteComment(struct Comments.Comment commentData, address caller, bytes32 commentId) → bool success` (external)

Execute after a comment is deleted




### `afterEditComment(struct Comments.Comment commentData, address caller, bytes32 commentId) → string commentHookData` (external)

Execute after a comment is edited






