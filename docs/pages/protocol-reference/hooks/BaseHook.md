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





### `beforeInitialize(address channel) → bool` (external)

Execute before a hook is initialized on a channel




### `_beforeInitialize(address) → bool` (internal)





### `afterInitialize(address channel) → bool` (external)

Execute after a hook is initialized on a channel




### `_afterInitialize(address) → bool` (internal)





### `beforeComment(struct Comments.CommentData commentData, address caller, bytes32 commentId) → bool` (external)

Execute before a comment is processed




### `_beforeComment(struct Comments.CommentData, address, bytes32) → bool` (internal)





### `afterComment(struct Comments.CommentData commentData, address caller, bytes32 commentId) → bool` (external)

Execute after a comment is processed




### `_afterComment(struct Comments.CommentData, address, bytes32) → bool` (internal)





### `beforeDeleteComment(struct Comments.CommentData commentData, address caller, bytes32 commentId) → bool` (external)

Execute before a comment is deleted




### `_beforeDeleteComment(struct Comments.CommentData, address, bytes32) → bool` (internal)





### `afterDeleteComment(struct Comments.CommentData commentData, address caller, bytes32 commentId) → bool` (external)

Execute after a comment is deleted




### `_afterDeleteComment(struct Comments.CommentData, address, bytes32) → bool` (internal)







