##### @ecp.eth/protocol

----

# `CommentManager`

This contract allows users to post and manage comments with optional app-signer approval and channel-specific hooks


Implements EIP-712 for typed structured data hashing and signing



## Modifiers

### `channelExists(uint256 channelId)`





### `commentExists(bytes32 commentId)`





### `notStale(uint256 deadline)`





### `replyInSameChannel(bytes32 parentId, uint256 channelId)`





### `onlyParentIdOrTargetUri(bytes32 parentId, string targetUri)`





### `validateNonce(address author, address app, uint256 nonce)`





### `onlyAuthor(address author)`








## Functions

### `constructor(address initialOwner)` (public)

Constructor initializes the contract with the deployer as owner and channel manager


Sets up EIP-712 domain separator


### `postComment(struct Comments.CreateComment commentData, bytes appSignature) → bytes32` (external)

Posts a comment directly from the author's address




### `postCommentWithSig(struct Comments.CreateComment commentData, bytes authorSignature, bytes appSignature) → bytes32` (external)

Posts a comment with both author and app signer signatures




### `_postComment(bytes32 commentId, struct Comments.CreateComment commentData)` (internal)





### `editComment(bytes32 commentId, struct Comments.EditComment editData, bytes appSignature)` (external)

Edits a comment when called by the author directly




### `editCommentWithSig(bytes32 commentId, struct Comments.EditComment editData, bytes authorSignature, bytes appSignature)` (external)

Edits a comment with both author and app signer signatures




### `_editComment(bytes32 commentId, struct Comments.EditComment editData)` (internal)

Internal function to handle comment editing logic




### `deleteComment(bytes32 commentId)` (external)

Deletes a comment when called by the author directly




### `deleteCommentWithSig(bytes32 commentId, address app, uint256 deadline, bytes authorSignature, bytes appSignature)` (external)

Deletes a comment with author signature verification




### `_deleteComment(bytes32 commentId, address author)` (internal)

Internal function to handle comment deletion logic




### `_getCommentMetadataInternal(bytes32 commentId) → struct Metadata.MetadataEntry[]` (internal)

Internal function to get metadata for a comment




### `_getCommentHookMetadataInternal(bytes32 commentId) → struct Metadata.MetadataEntry[]` (internal)

Internal function to get hook metadata for a comment




### `_clearCommentMetadata(bytes32 commentId)` (internal)

Internal function to clear all metadata for a comment




### `_clearCommentHookMetadata(bytes32 commentId)` (internal)

Internal function to clear all hook metadata for a comment




### `addApproval(address app)` (external)

Approves an app signer when called directly by the author




### `addApprovalWithSig(address author, address app, uint256 nonce, uint256 deadline, bytes authorSignature)` (external)

Approves an app signer with signature verification




### `revokeApproval(address app)` (external)

Removes an app signer approval when called directly by the author




### `removeApprovalWithSig(address author, address app, uint256 nonce, uint256 deadline, bytes authorSignature)` (external)

Removes an app signer approval with signature verification




### `getAddApprovalHash(address author, address app, uint256 nonce, uint256 deadline) → bytes32` (public)

Calculates the EIP-712 hash for a permit




### `getRemoveApprovalHash(address author, address app, uint256 nonce, uint256 deadline) → bytes32` (public)

Calculates the EIP-712 hash for removing an approval




### `getDeleteCommentHash(bytes32 commentId, address author, address app, uint256 deadline) → bytes32` (public)

Calculates the EIP-712 hash for deleting a comment




### `getEditCommentHash(bytes32 commentId, address author, struct Comments.EditComment editData) → bytes32` (public)

Calculates the EIP-712 hash for editing a comment




### `getCommentId(struct Comments.CreateComment commentData) → bytes32` (public)

Calculates the EIP-712 hash for a comment




### `_hashMetadataArray(struct Metadata.MetadataEntry[] metadata) → bytes32` (internal)

Internal function to hash metadata array for EIP-712




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




### `updateCommentHookData(bytes32 commentId)` (external)

Updates hook metadata for an existing comment using merge mode (gas-efficient)


Only updates provided metadata fields without clearing existing ones


### `_updateCommentHookData(bytes32 commentId)` (internal)

Internal function to update hook metadata using merge mode for gas efficiency




### `_applyHookMetadataOperations(bytes32 commentId, struct Metadata.MetadataEntryOp[] operations)` (internal)

Internal function to apply hook metadata operations efficiently




### `_deleteCommentHookMetadataKey(bytes32 commentId, bytes32 keyToDelete)` (internal)

Internal function to delete a specific hook metadata key




### `_hookMetadataKeyExists(bytes32 commentId, bytes32 targetKey) → bool exists` (internal)

Internal function to check if a hook metadata key exists




### `_addApproval(address author, address app)` (internal)

Internal function to add an app signer approval




### `_revokeApproval(address author, address app)` (internal)

Internal function to remove an app signer approval






