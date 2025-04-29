##### @ecp.eth/protocol

----

# `ChannelManager`

This contract allows creation and management of channels with configurable hooks, where each channel is an NFT


Implements channel management with the following security features:



## Modifiers

### `onlyCommentsContract()`








## Functions

### `_generateChannelId(address creator, string name, string description, string metadata) → uint256` (internal)

Generates a unique channel ID based on input parameters




### `constructor(address initialOwner)` (public)

Constructor sets the contract owner and initializes ERC721




### `registerHook(address hook)` (external)

Registers a new hook in the global registry




### `setHookGloballyEnabled(address hook, bool enabled)` (external)

Enables or disables a hook globally (only owner)




### `getHookStatus(address hook) → struct IChannelManager.HookConfig` (external)

Checks if a hook is registered and globally enabled




### `_channelExists(uint256 channelId) → bool` (internal)

Internal function to check if a channel exists




### `createChannel(string name, string description, string metadata, address hook) → uint256 channelId` (external)

Creates a new channel as an NFT with a hash-based ID




### `updateChannel(uint256 channelId, string name, string description, string metadata)` (external)

Updates an existing channel's configuration




### `setHook(uint256 channelId, address hook)` (external)

Sets the hook for a channel




### `_setHook(uint256 channelId, address hook)` (internal)

Internal function to set the hook for a channel




### `getChannel(uint256 channelId) → string name, string description, string metadata, address hook` (external)

Gets a channel's configuration




### `executeHooks(uint256 channelId, struct ICommentTypes.CommentData commentData, address caller, bytes32 commentId, enum IChannelManager.HookPhase phase) → bool` (external)

Public function to execute hook for a channel




### `channelExists(uint256 channelId) → bool` (public)

Check if a channel exists




### `getChannelOwner(uint256 channelId) → address` (external)

Gets the owner of a channel




### `updateCommentsContract(address _commentsContract)` (external)

Updates the comments contract address (only owner)




### `setBaseURI(string baseURI_)` (external)

Sets the base URI for NFT metadata




### `_baseURI() → string` (internal)

Returns the base URI for token metadata


Internal function that overrides ERC721's _baseURI()



