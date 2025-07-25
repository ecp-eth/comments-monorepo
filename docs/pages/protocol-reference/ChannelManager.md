##### @ecp.eth/protocol

----

# `ChannelManager`

This contract allows creation and management of channels with configurable hooks, where each channel is an NFT


Implements channel management with the following security features:







## Functions

### constructor(address initialOwner) (public)

Constructor sets the contract owner and initializes ERC721




### getChannel(uint256 channelId) → [struct Channels.Channel](/protocol-reference/types/Channels#channel) (external)

Get a channel by its ID




### _getChannelId(address creator, string name, string description, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata) → uint256 (internal)

Calculates a unique hash for a channel




### _channelExists(uint256 channelId) → bool (internal)

Internal function to check if a channel exists




### _hashMetadataArray([struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata) → bytes32 (internal)

Internal function to hash metadata array for deterministic channel ID generation




### createChannel(string name, string description, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata, address hook) → uint256 channelId (external)

Creates a new channel




### updateChannel(uint256 channelId, string name, string description, [struct Metadata.MetadataEntryOp[]](/protocol-reference/types/Metadata#metadataentryop) metadataOperations) (external)

Updates an existing channel's configuration




### setHook(uint256 channelId, address hook) (external)

Sets the hook for a channel




### _setHook(uint256 channelId, address hook) (internal)

Internal function to set the hook for a channel




### channelExists(uint256 channelId) → bool (external)

Checks if a channel exists




### setBaseURI(string baseURI_) (external)

Sets the base URI for NFT metadata




### _baseURI() → string (internal)

Returns the base URI for token metadata


Internal function that overrides ERC721's _baseURI()

### _createChannelMetadata(uint256 channelId, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata) (internal)

Internal function to create channel metadata




### _setChannelMetadata(uint256 channelId, [struct Metadata.MetadataEntryOp[]](/protocol-reference/types/Metadata#metadataentryop) operations) (internal)

Sets metadata for a channel




### _deleteChannelMetadataKey(uint256 channelId, bytes32 keyToDelete) (internal)

Internal function to delete a specific channel metadata key




### _channelMetadataKeyExists(uint256 channelId, bytes32 targetKey) → bool (internal)

Internal function to check if a channel metadata key exists




### getChannelMetadata(uint256 channelId) → [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) (public)

Get all metadata for a channel




### getChannelMetadataValue(uint256 channelId, bytes32 key) → bytes (external)

Get metadata value for a specific key




### getChannelMetadataKeys(uint256 channelId) → bytes32[] (external)

Get all metadata keys for a channel






