##### @ecp.eth/protocol

----

# `ICommentTypes`





## Structs

### `CommentData`


- **author:** (address) The address of the comment author



- **appSigner:** (address) The address of the application signer that authorized this comment



- **channelId:** (uint256) The channel ID associated with the comment



- **nonce:** (uint256) The nonce for the comment



- **deadline:** (uint256) Timestamp after which the signatures for this comment become invalid



- **parentId:** (bytes32) The ID of the parent comment if this is a reply, otherwise bytes32(0)


- **content:** (string) The actual text content of the comment



- **metadata:** (string) Additional JSON data that shouldn't be shown to the user as it is



- **targetUri:** (string) the URI about which the comment is being made



- **commentType:** (string) The type of the comment (e.g. "question", "answer", "feedback", etc.)











