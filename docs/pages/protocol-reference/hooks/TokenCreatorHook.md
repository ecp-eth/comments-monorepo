##### @ecp.eth/protocol

----

# `TokenCreatorHook`

Hook that gates channels to only allow token creators to post top-level comments. Similar to telegram channels.


Requires channel metadata to contain tokenAddress and tokenCreator fields

## Structs

### `TokenInfo`


- **tokenAddress:** (address) 


- **tokenCreator:** (address) 


- **tokenChainId:** (uint256) 





## Events

### `ChannelSetup(uint256 channelId, address tokenAddress, address tokenCreator, uint256 tokenChainId)`






## Functions

### `getChannelCount() → uint256` (public)





### `getChannelIdAt(uint256 index) → uint256` (public)





### `getChannelTokenInfo(uint256 channelId) → struct TokenCreatorHook.TokenInfo` (public)





### `channelExists(uint256 channelId) → bool` (public)





### `getAllChannels() → uint256[] channelIds, struct TokenCreatorHook.TokenInfo[] tokenInfos` (public)





### `_getHookPermissions() → struct Hooks.Permissions` (internal)





### `_onInitialized(address, struct Channels.Channel channel, uint256 channelId) → bool` (internal)





### `_isValidTokenCAIP19(string targetUri, address tokenAddress, uint256 tokenChainId) → bool` (internal)





### `_onCommentAdded(struct Comments.Comment commentData, address, bytes32) → string` (internal)





### `_bytesToUint(bytes b) → uint256` (internal)





### `_bytesToAddress(bytes b) → address` (internal)





### `_bytesToAddressAlternative(bytes b) → address` (internal)





### `_extractJsonValue(string json, string key) → bytes` (internal)







