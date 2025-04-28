##### @ecp.eth/protocol

----

# `IChannelManager`

This interface defines the core functionality for managing channels and their associated hooks



## Structs

### `ChannelConfig`


- **name:** (string) 


- **description:** (string) 


- **metadata:** (string) 


- **hook:** (contract IHook) 


- **hookEnabled:** (bool) 


### `HookConfig`


- **registered:** (bool) 


- **enabled:** (bool) 





## Events

### `HookExecutionFailed(uint256 channelId, address hook, enum IChannelManager.HookPhase phase)`

Emitted when a hook execution fails




### `HookRegistered(address hook)`

Emitted when a hook is registered in the global registry




### `HookGlobalStatusUpdated(address hook, bool enabled)`

Emitted when a hook's global enabled status is updated




### `BaseURIUpdated(string baseURI)`

Emitted when the base URI for NFT metadata is updated




### `ChannelCreated(uint256 channelId, string name, string metadata)`

Emitted when a new channel is created




### `ChannelUpdated(uint256 channelId, string name, string description, string metadata)`

Emitted when a channel's configuration is updated




### `HookSet(uint256 channelId, address hook)`

Emitted when a hook is set for a channel




### `HookStatusUpdated(uint256 channelId, address hook, bool enabled)`

Emitted when a hook's enabled status is updated





## Functions

### `createChannel(string name, string description, string metadata, address hook) → uint256 channelId` (external)

Creates a new channel




### `updateChannel(uint256 channelId, string name, string description, string metadata)` (external)

Updates an existing channel's configuration




### `setHook(uint256 channelId, address hook)` (external)

Sets the hook for a channel




### `getChannel(uint256 channelId) → string name, string description, string metadata, address hook` (external)

Gets a channel's configuration




### `setHookGloballyEnabled(address hook, bool enabled)` (external)

Enables or disables a hook globally (only owner)




### `getHookStatus(address hook) → struct IChannelManager.HookConfig` (external)

Checks if a hook is registered and globally enabled




### `updateCommentsContract(address _commentsContract)` (external)

Updates the comments contract address (only owner)




### `setBaseURI(string baseURI_)` (external)

Sets the base URI for NFT metadata




### `executeHooks(uint256 channelId, struct ICommentTypes.CommentData commentData, address caller, bytes32 commentId, enum IChannelManager.HookPhase phase) → bool` (external)

Executes hook for a channel




### `channelExists(uint256 channelId) → bool` (external)

Checks if a channel exists




### `registerHook(address hook)` (external)

Registers a new hook in the global registry




### `getChannelOwner(uint256 channelId) → address` (external)

Gets the owner of a channel





## Enums

### `HookPhase`








