##### @ecp.eth/protocol

---

# `TokenCreatorHook`

Hook that gates channels to only allow token creators to post top-level comments. Similar to telegram channels.

Requires channel metadata to contain tokenAddress and tokenCreator fields

## Structs

### `TokenInfo`

Structure to store token information

- **tokenAddress:** (address) The address of the token contract

- **tokenCreator:** (address) The address of the token creator

- **tokenChainId:** (uint256) The chain ID where the token exists

## Events

### `ChannelSetup(uint256 channelId, address tokenAddress, address tokenCreator, uint256 tokenChainId)`

Event emitted when token info for a channel is set up

## Functions

### getChannelCount() → uint256 (public)

Get the total number of channels

### getChannelIdAt(uint256 index) → uint256 (public)

Get the channel ID at a specific index

### getChannelTokenInfo(uint256 channelId) → [struct TokenCreatorHook.TokenInfo](/protocol-reference/hooks/TokenCreatorHook#tokeninfo) (public)

Get token information for a specific channel

### channelExists(uint256 channelId) → bool (public)

Check if a channel exists

### getAllChannels() → uint256[] channelIds, [struct TokenCreatorHook.TokenInfo[]](/protocol-reference/hooks/TokenCreatorHook#tokeninfo) tokenInfos (public)

Get all channels with their token information

### \_getHookPermissions() → [struct Hooks.Permissions](/protocol-reference/types/Hooks#permissions) (internal)

### \_onInitialize(address, [struct Channels.Channel](/protocol-reference/types/Channels#channel) channel, uint256 channelId, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata) → bool (internal)

### \_isValidTokenCAIP19(string targetUri, address tokenAddress, uint256 tokenChainId) → bool (internal)

### \_onCommentAdd([struct Comments.Comment](/protocol-reference/types/Comments#comment) commentData, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry), address, bytes32) → [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) (internal)
