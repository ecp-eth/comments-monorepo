##### @ecp.eth/protocol

----

# `BroadcastHook`

Hook that gates channels to only allow whitelisted creators to create channels and post top-level comments.


Similar to TokenCreatorHook but uses a whitelist instead of token ownership





## Events

### `ChannelCreated(uint256 channelId, address creator, string name, string description, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata)`

Event emitted when a channel is created




### `WhitelistModeSet(bool enabled)`

Event emitted when whitelist mode is toggled




### `WhitelistStatusChanged(address user, bool isWhitelisted)`

Event emitted when an address is whitelisted/unwhitelisted





## Functions

### constructor(address _channelManager) (public)





### createChannel(string name, string description, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata) → uint256 (external)

Create a new channel




### setWhitelistMode(bool enabled) (external)

Enable or disable whitelist mode




### setWhitelistStatus(address user, bool status) (external)

Add or remove an address from the whitelist




### isWhitelisted(address user) → bool (external)

Check if an address is whitelisted




### _getHookPermissions() → [struct Hooks.Permissions](/protocol-reference/types/Hooks#permissions) (internal)





### _onCommentAdd([struct Comments.Comment](/protocol-reference/types/Comments#comment) commentData, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry), address, bytes32) → [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) (internal)





### onERC721Received(address, address, uint256, bytes) → bytes4 (external)

Allows the contract to receive ERC721 tokens



### receive() (external)

Allows the contract to receive ETH





