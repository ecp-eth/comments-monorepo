##### @ecp.eth/protocol

----

# `CommentManager`

This contract allows users to post and manage comments with optional app-signer approval and channel-specific hooks


Implements EIP-712 for typed structured data hashing and signing



## Modifiers

### `channelExists(uint256 channelId)`





### `commentExists(bytes32 commentId)`





### `notStale(uint256 deadline)`





### `onlyReplyInSameChannel(bytes32 parentId, uint256 channelId)`





### `onlyParentIdOrTargetUri(bytes32 parentId, string targetUri)`





### `validateNonce(address author, address app, uint256 nonce)`





### `onlyAuthor(address author)`





### `reactionHasTargetOrParent(uint8 commentType, bytes32 parentId, string targetUri)`








## Functions

### constructor(address initialOwner) (public)

Constructor initializes the contract with the deployer as owner and channel manager


Sets up EIP-712 domain separator


### postComment([struct Comments.CreateComment](/protocol-reference/types/Comments#createcomment) commentData, bytes appSignature) → bytes32 (external)

Posts a comment directly from the author's address




### _postComment([struct Comments.CreateComment](/protocol-reference/types/Comments#createcomment) commentData, bytes appSignature, uint256 value) → bytes32 (internal)

Internal function to handle comment posting with explicit value



### postCommentWithSig([struct Comments.CreateComment](/protocol-reference/types/Comments#createcomment) commentData, bytes authorSignature, bytes appSignature) → bytes32 (external)

Posts a comment with both author and app signer signatures




### _postCommentWithSig([struct Comments.CreateComment](/protocol-reference/types/Comments#createcomment) commentData, bytes authorSignature, bytes appSignature, uint256 value) → bytes32 (internal)

Internal function to handle comment posting with signature and explicit value


This function is used to post a comment with a signature and explicit value


### _createComment(bytes32 commentId, [struct Comments.CreateComment](/protocol-reference/types/Comments#createcomment) commentData, [enum Comments.AuthorAuthMethod](/protocol-reference/types/Comments#authorauthmethod) authMethod, uint256 value) (internal)





### editComment(bytes32 commentId, [struct Comments.EditComment](/protocol-reference/types/Comments#editcomment) editData, bytes appSignature) (external)

Edits a comment when called by the author directly




### _editCommentDirect(bytes32 commentId, [struct Comments.EditComment](/protocol-reference/types/Comments#editcomment) editData, bytes appSignature, uint256 value) (internal)

Internal function to handle comment editing with explicit value


This function is used to edit a comment with an explicit value


### editCommentWithSig(bytes32 commentId, [struct Comments.EditComment](/protocol-reference/types/Comments#editcomment) editData, bytes authorSignature, bytes appSignature) (external)

Edits a comment with both author and app signer signatures




### _editCommentWithSig(bytes32 commentId, [struct Comments.EditComment](/protocol-reference/types/Comments#editcomment) editData, bytes authorSignature, bytes appSignature, uint256 value) (internal)

Internal function to handle comment editing with signature and explicit value


This function is used to edit a comment with a signature and explicit value


### _editComment(bytes32 commentId, [struct Comments.EditComment](/protocol-reference/types/Comments#editcomment) editData, [enum Comments.AuthorAuthMethod](/protocol-reference/types/Comments#authorauthmethod) authMethod, uint256 value) (internal)

Internal function to handle comment editing logic




### deleteComment(bytes32 commentId) (public)

Deletes a comment when called by the author directly




### deleteCommentWithSig(bytes32 commentId, address app, uint256 deadline, bytes authorSignature, bytes appSignature) (public)

Deletes a comment with author signature verification




### _deleteComment(bytes32 commentId, address author) (internal)

Internal function to handle comment deletion logic




### addApproval(address app, uint256 expiry) (external)

Approves an app signer when called directly by the author




### addApprovalWithSig(address author, address app, uint256 expiry, uint256 nonce, uint256 deadline, bytes authorSignature) (external)

Approves an app signer with signature verification




### revokeApproval(address app) (external)

Removes an app signer approval when called directly by the author




### removeApprovalWithSig(address author, address app, uint256 nonce, uint256 deadline, bytes authorSignature) (external)

Removes an app signer approval with signature verification




### updateCommentHookData(bytes32 commentId) (external)

Updates hook metadata for an existing comment using merge mode (gas-efficient). Anyone can call this function.


Only updates provided metadata fields without clearing existing ones


### getAddApprovalHash(address author, address app, uint256 expiry, uint256 nonce, uint256 deadline) → bytes32 (public)

Calculates the EIP-712 hash for a permit




### getRemoveApprovalHash(address author, address app, uint256 nonce, uint256 deadline) → bytes32 (public)

Calculates the EIP-712 hash for removing an approval




### getDeleteCommentHash(bytes32 commentId, address author, address app, uint256 deadline) → bytes32 (public)

Calculates the EIP-712 hash for deleting a comment




### getEditCommentHash(bytes32 commentId, address author, [struct Comments.EditComment](/protocol-reference/types/Comments#editcomment) editData) → bytes32 (public)

Calculates the EIP-712 hash for editing a comment




### getCommentId([struct Comments.CreateComment](/protocol-reference/types/Comments#createcomment) commentData) → bytes32 (public)

Calculates the EIP-712 hash for a comment




### updateChannelContract(address _channelContract) (external)

Updates the channel manager contract address (only owner)




### getComment(bytes32 commentId) → [struct Comments.Comment](/protocol-reference/types/Comments#comment) (external)

Get a comment by its ID




### getCommentMetadata(bytes32 commentId) → [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) (external)

Get metadata for a comment




### getCommentHookMetadata(bytes32 commentId) → [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) (external)

Get hook metadata for a comment




### getCommentMetadataValue(bytes32 commentId, bytes32 key) → bytes (external)

Get a specific metadata value for a comment




### getCommentHookMetadataValue(bytes32 commentId, bytes32 key) → bytes (external)

Get a specific hook metadata value for a comment




### getCommentMetadataKeys(bytes32 commentId) → bytes32[] (external)

Get all metadata keys for a comment




### getCommentHookMetadataKeys(bytes32 commentId) → bytes32[] (external)

Get all hook metadata keys for a comment




### isApproved(address author, address app) → bool (external)

Get the approval status for an author and app




### getApprovalExpiry(address author, address app) → uint256 (external)

Get the approval expiry timestamp for an author and app




### getNonce(address author, address app) → uint256 (external)

Get the nonce for an author and app




### isDeleted(bytes32 commentId) → bool (external)

Get the deleted status for a comment




### batchOperations([struct Comments.BatchOperation[]](/protocol-reference/types/Comments#batchoperation) operations) → bytes[] results (external)

Executes multiple operations (post, edit, delete) in a single transaction preserving order




### _executeBatchOperation([struct Comments.BatchOperation](/protocol-reference/types/Comments#batchoperation) operation, uint256 operationIndex) → bytes result (internal)

Internal function to execute a single batch operation




### _executePostCommentBatch([struct Comments.BatchOperation](/protocol-reference/types/Comments#batchoperation) operation) → bytes (internal)





### _executePostCommentWithSigBatch([struct Comments.BatchOperation](/protocol-reference/types/Comments#batchoperation) operation) → bytes (internal)





### _executeEditCommentBatch([struct Comments.BatchOperation](/protocol-reference/types/Comments#batchoperation) operation) → bytes (internal)





### _executeEditCommentWithSigBatch([struct Comments.BatchOperation](/protocol-reference/types/Comments#batchoperation) operation) → bytes (internal)





### _executeDeleteCommentBatch([struct Comments.BatchOperation](/protocol-reference/types/Comments#batchoperation) operation) → bytes (internal)





### _executeDeleteCommentWithSigBatch([struct Comments.BatchOperation](/protocol-reference/types/Comments#batchoperation) operation) → bytes (internal)







