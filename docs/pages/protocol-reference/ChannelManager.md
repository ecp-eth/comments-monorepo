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




### `_channelExists(uint256 channelId) → bool` (internal)

Internal function to check if a channel exists




### `createChannel(string name, string description, string metadata, address hook) → uint256 channelId` (external)

Creates a new channel




### `updateChannel(uint256 channelId, string name, string description, string metadata)` (external)

Updates an existing channel's configuration




### `setHook(uint256 channelId, address hook)` (external)

Sets the hook for a channel




### `_setHook(uint256 channelId, address hook)` (internal)

Internal function to set the hook for a channel




### `getChannel(uint256 channelId) → string name, string description, string metadata, address hook` (external)

Gets a channel's configuration




### `executeHook(uint256 channelId, struct Comments.CommentData commentData, address caller, bytes32 commentId, enum Hooks.HookPhase phase) → bool` (external)

Executes hook for a channel




### `channelExists(uint256 channelId) → bool` (public)

Checks if a channel exists




### `getChannelOwner(uint256 channelId) → address` (external)

Gets the owner of a channel




### `updateCommentsContract(address _commentsContract)` (external)

Updates the comments contract address (only owner)




### `setBaseURI(string baseURI_)` (external)

Sets the base URI for NFT metadata




### `_baseURI() → string` (internal)

Returns the base URI for token metadata


Internal function that overrides ERC721's _baseURI()



