##### @ecp.eth/protocol

----

# `ICommentManager`

This interface defines the functions and events for the Comments contract







## Events

### `CommentAdded(bytes32 commentId, address author, address app, uint256 channelId, bytes32 parentId, uint96 createdAt, string content, string targetUri, uint8 commentType, struct Metadata.MetadataEntry[] metadata)`

Emitted when a new comment is added




### `CommentMetadataSet(bytes32 commentId, bytes32 key, bytes value)`

Emitted when metadata is set for a comment




### `CommentHookMetadataSet(bytes32 commentId, bytes32 key, bytes value)`

Emitted when hook metadata is set for a comment




### `CommentDeleted(bytes32 commentId, address author)`

Emitted when a comment is deleted




### `CommentEdited(bytes32 commentId, address editedByApp, address author, address app, uint256 channelId, bytes32 parentId, uint96 createdAt, uint96 updatedAt, string content, string targetUri, uint8 commentType, struct Metadata.MetadataEntry[] metadata)`

Emitted when a comment is edited




### `ApprovalAdded(address author, address app)`

Emitted when an author approves an app signer




### `ApprovalRemoved(address author, address app)`

Emitted when an author removes an app signer's approval





## Functions

### `postComment(struct Comments.CreateComment commentData, bytes appSignature) → bytes32 commentId` (external)

Posts a comment directly from the author's address




### `postCommentWithSig(struct Comments.CreateComment commentData, bytes authorSignature, bytes appSignature) → bytes32 commentId` (external)

Posts a comment with both author and app signer signatures




### `deleteComment(bytes32 commentId)` (external)

Deletes a comment when called by the author directly




### `deleteCommentWithSig(bytes32 commentId, address app, uint256 deadline, bytes authorSignature, bytes appSignature)` (external)

Deletes a comment with author signature verification




### `editComment(bytes32 commentId, struct Comments.EditComment editData, bytes appSignature)` (external)

Edits a comment when called by the author directly




### `editCommentWithSig(bytes32 commentId, struct Comments.EditComment editData, bytes authorSignature, bytes appSignature)` (external)

Edits a comment with both author and app signer signatures




### `updateCommentHookData(bytes32 commentId)` (external)

Updates hook metadata for an existing comment using merge mode (gas-efficient)


Only updates provided metadata fields without clearing existing ones


### `addApproval(address app)` (external)

Approves an app signer when called directly by the author




### `revokeApproval(address app)` (external)

Removes an app signer approval when called directly by the author




### `addApprovalWithSig(address author, address app, uint256 nonce, uint256 deadline, bytes signature)` (external)

Approves an app signer with signature verification




### `removeApprovalWithSig(address author, address app, uint256 nonce, uint256 deadline, bytes signature)` (external)

Removes an app signer approval with signature verification




### `getAddApprovalHash(address author, address app, uint256 nonce, uint256 deadline) → bytes32` (external)

Calculates the EIP-712 hash for a permit




### `getRemoveApprovalHash(address author, address app, uint256 nonce, uint256 deadline) → bytes32` (external)

Calculates the EIP-712 hash for removing an approval




### `getDeleteCommentHash(bytes32 commentId, address author, address app, uint256 deadline) → bytes32` (external)

Calculates the EIP-712 hash for deleting a comment




### `getEditCommentHash(bytes32 commentId, address author, struct Comments.EditComment editData) → bytes32` (external)

Calculates the EIP-712 hash for editing a comment




### `getCommentId(struct Comments.CreateComment commentData) → bytes32` (external)

Calculates the EIP-712 hash for a comment




### `updateChannelContract(address _channelContract)` (external)

Updates the channel manager contract address (only owner)




### `getComment(bytes32 commentId) → struct Comments.Comment` (external)

Get a comment by its ID




### `getCommentMetadata(bytes32 commentId) → struct Metadata.MetadataEntry[]` (external)

Get metadata for a comment




### `getCommentHookMetadata(bytes32 commentId) → struct Metadata.MetadataEntry[]` (external)

Get hook metadata for a comment




### `getCommentMetadataValue(bytes32 commentId, bytes32 key) → bytes` (external)

Get a specific metadata value for a comment




### `getCommentHookMetadataValue(bytes32 commentId, bytes32 key) → bytes` (external)

Get a specific hook metadata value for a comment




### `getCommentMetadataKeys(bytes32 commentId) → bytes32[]` (external)

Get all metadata keys for a comment




### `getCommentHookMetadataKeys(bytes32 commentId) → bytes32[]` (external)

Get all hook metadata keys for a comment




### `isApproved(address author, address app) → bool` (external)

Get the approval status for an author and app




### `getNonce(address author, address app) → uint256` (external)

Get the nonce for an author and app




### `isDeleted(bytes32 commentId) → bool` (external)

Get the deleted status for a comment






