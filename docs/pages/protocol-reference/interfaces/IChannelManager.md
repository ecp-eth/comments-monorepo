##### @ecp.eth/protocol

----

# `IChannelManager`

This interface defines the core functionality for managing channels and their associated hooks







## Events

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




### `getChannel(uint256 channelId) → struct Channels.Channel` (external)

Get a channel by its ID




### `updateChannel(uint256 channelId, string name, string description, string metadata)` (external)

Updates an existing channel's configuration




### `setHook(uint256 channelId, address hook)` (external)

Sets the hook for a channel




### `updateCommentsContract(address _commentsContract)` (external)

Updates the comments contract address (only owner)




### `setBaseURI(string baseURI_)` (external)

Sets the base URI for NFT metadata




### `channelExists(uint256 channelId) → bool` (external)

Checks if a channel exists




### `getChannelOwner(uint256 channelId) → address` (external)

Gets the owner of a channel






