##### @ecp.eth/protocol

----

# `Comments`





## Structs

### `Comment`

Struct containing all comment data





- **author:** (address) The address of the comment author



- **createdAt:** (uint96) The timestamp when the comment was created



- **app:** (address) The address of the application signer that authorized this comment



- **updatedAt:** (uint88) The timestamp when the comment was last updated



- **commentType:** (uint8) The type of the comment (0=comment, 1=reaction)



- **channelId:** (uint256) The channel ID associated with the comment



- **parentId:** (bytes32) The ID of the parent comment if this is a reply, otherwise bytes32(0)



- **content:** (string) The text content of the comment - may contain urls, images and mentions



- **targetUri:** (string) the URI about which the comment is being made


### `CreateComment`

Struct containing all comment data for creating a comment





- **author:** (address) The address of the comment author



- **app:** (address) The address of the application signer that authorized this comment



- **channelId:** (uint256) The channel ID associated with the comment



- **deadline:** (uint256) Timestamp after which the signatures for this comment become invalid



- **parentId:** (bytes32) The ID of the parent comment if this is a reply, otherwise bytes32(0)



- **commentType:** (uint8) The type of the comment (0=comment, 1=reaction)


- **content:** (string) The actual text content of the comment. If the commentType is COMMENT_TYPE_REACTION, the content should be the reaction type, such as "like", "downvote", "repost" etc.



- **metadata:** (struct Metadata.MetadataEntry[]) Array of key-value pairs for additional data



- **targetUri:** (string) the URI about which the comment is being made



### `EditComment`

Struct containing all comment data for editing a comment





- **app:** (address) The address of the application signer that authorized this comment



- **nonce:** (uint256) The nonce for the comment



- **deadline:** (uint256) Timestamp after which the signatures for this comment become invalid



- **content:** (string) The actual text content of the comment



- **metadata:** (struct Metadata.MetadataEntry[]) Array of key-value pairs for additional data










