##### @ecp.eth/protocol

----

# `ICommentManager`

This interface defines the functions and events for the Comments contract







## Events

### `CommentAdded(bytes32 commentId, address author, address appSigner, struct Comments.CommentData commentData)`

Emitted when a new comment is added




### `CommentDeleted(bytes32 commentId, address author)`

Emitted when a comment is deleted




### `ApprovalAdded(address author, address appSigner)`

Emitted when an author approves an app signer




### `ApprovalRemoved(address author, address appSigner)`

Emitted when an author removes an app signer's approval





## Functions

### `postCommentAsAuthor(struct Comments.CommentData commentData, bytes appSignature)` (external)

Posts a comment directly from the author's address




### `postComment(struct Comments.CommentData commentData, bytes authorSignature, bytes appSignature)` (external)

Posts a comment with both author and app signer signatures




### `deleteCommentAsAuthor(bytes32 commentId)` (external)

Deletes a comment when called by the author directly




### `deleteComment(bytes32 commentId, address author, address appSigner, uint256 nonce, uint256 deadline, bytes authorSignature, bytes appSignature)` (external)

Deletes a comment with author signature verification




### `addApprovalAsAuthor(address appSigner)` (external)

Approves an app signer when called directly by the author




### `revokeApprovalAsAuthor(address appSigner)` (external)

Removes an app signer approval when called directly by the author




### `addApproval(address author, address appSigner, uint256 nonce, uint256 deadline, bytes signature)` (external)

Approves an app signer with signature verification




### `removeApproval(address author, address appSigner, uint256 nonce, uint256 deadline, bytes signature)` (external)

Removes an app signer approval with signature verification




### `getAddApprovalHash(address author, address appSigner, uint256 nonce, uint256 deadline) → bytes32` (external)

Calculates the EIP-712 hash for a permit




### `getRemoveApprovalHash(address author, address appSigner, uint256 nonce, uint256 deadline) → bytes32` (external)

Calculates the EIP-712 hash for removing an approval




### `getDeleteCommentHash(bytes32 commentId, address author, address appSigner, uint256 nonce, uint256 deadline) → bytes32` (external)

Calculates the EIP-712 hash for deleting a comment




### `getCommentId(struct Comments.CommentData commentData) → bytes32` (external)

Calculates the EIP-712 hash for a comment




### `getComment(bytes32 commentId) → struct Comments.CommentData` (external)

Get comment data by ID




### `updateChannelContract(address _channelContract)` (external)

Updates the channel manager contract address (only owner)






