##### @ecp.eth/protocol

----

# `IHook`











## Functions

### `getHookPermissions() → struct Hooks.Permissions` (external)





### `beforeInitialize(address channel) → bool success` (external)

Execute before a hook is initialized on a channel




### `afterInitialize(address channel) → bool success` (external)

Execute after a hook is initialized on a channel




### `beforeComment(struct Comments.CommentData commentData, address caller, bytes32 commentId) → bool success` (external)

Execute before a comment is processed




### `afterComment(struct Comments.CommentData commentData, address caller, bytes32 commentId) → bool success` (external)

Execute after a comment is processed




### `beforeDeleteComment(struct Comments.CommentData commentData, address caller, bytes32 commentId) → bool success` (external)

Execute before a comment is deleted




### `afterDeleteComment(struct Comments.CommentData commentData, address caller, bytes32 commentId) → bool success` (external)

Execute after a comment is deleted






