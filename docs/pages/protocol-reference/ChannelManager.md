##### @ecp.eth/protocol

---

# `ChannelManager`

This contract allows creation and management of channels with configurable hooks, where each channel is an NFT

Implements channel management with the following security features:

## Modifiers

### `onlyCommentsContract()`

## Functions

### `constructor(address initialOwner)` (public)

Constructor sets the contract owner and initializes ERC721

### `getChannel(uint256 channelId) → struct Channels.Channel` (external)

Get a channel by its ID

### `getChannelId(address creator, string name, string description, Metadata.MetadataEntry[] metadata) → uint256` (public)

Generates a unique channel ID based on input parameters

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

### `channelExists(uint256 channelId) → bool` (external)

Checks if a channel exists

### `updateCommentsContract(address _commentsContract)` (external)

Updates the comments contract address (only owner)

### `setBaseURI(string baseURI_)` (external)

Sets the base URI for NFT metadata

### `_baseURI() → string` (internal)

Returns the base URI for token metadata

Internal function that overrides ERC721's \_baseURI()
