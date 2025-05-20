##### @ecp.eth/protocol

----

# `ICommentManager`

This interface defines the functions and events for the Comments contract







## Events

### `CommentAdded(bytes32 commentId, address author, address app, struct Comments.Comment commentData)`

Emitted when a new comment is added




### `CommentDeleted(bytes32 commentId, address author)`

Emitted when a comment is deleted




### `CommentEdited(bytes32 commentId, address author, address app, struct Comments.Comment comment)`

Emitted when a comment is edited




### `CommentHookDataUpdated(bytes32 commentId, string hookData)`

Emitted when a comment's hook data is updated




### `ApprovalAdded(address author, address app)`

Emitted when an author approves an app signer




### `ApprovalRemoved(address author, address app)`

Emitted when an author removes an app signer's approval





## Functions

### `postComment(struct Comments.CreateComment commentData, bytes appSignature)` (external)

Posts a comment directly from the author's address




### `postCommentWithApproval(struct Comments.CreateComment commentData, bytes authorSignature, bytes appSignature)` (external)

Posts a comment with both author and app signer signatures




### `deleteComment(bytes32 commentId)` (external)

Deletes a comment when called by the author directly




### `deleteCommentWithApproval(bytes32 commentId, address app, uint256 nonce, uint256 deadline, bytes authorSignature, bytes appSignature)` (external)

Deletes a comment with author signature verification




### `editComment(bytes32 commentId, struct Comments.EditComment editData, bytes appSignature)` (external)

Edits a comment when called by the author directly




### `editCommentWithApproval(bytes32 commentId, struct Comments.EditComment editData, bytes authorSignature, bytes appSignature)` (external)

Edits a comment with both author and app signer signatures




### `addApprovalAsAuthor(address app)` (external)

Approves an app signer when called directly by the author




### `revokeApprovalAsAuthor(address app)` (external)

Removes an app signer approval when called directly by the author




### `addApproval(address author, address app, uint256 nonce, uint256 deadline, bytes signature)` (external)

Approves an app signer with signature verification




### `removeApproval(address author, address app, uint256 nonce, uint256 deadline, bytes signature)` (external)

Removes an app signer approval with signature verification




### `getAddApprovalHash(address author, address app, uint256 nonce, uint256 deadline) → bytes32` (external)

Calculates the EIP-712 hash for a permit




### `getRemoveApprovalHash(address author, address app, uint256 nonce, uint256 deadline) → bytes32` (external)

Calculates the EIP-712 hash for removing an approval




### `getDeleteCommentHash(bytes32 commentId, address author, address app, uint256 nonce, uint256 deadline) → bytes32` (external)

Calculates the EIP-712 hash for deleting a comment




### `getEditCommentHash(bytes32 commentId, address author, struct Comments.EditComment editData) → bytes32` (external)

Calculates the EIP-712 hash for editing a comment




### `getCommentId(struct Comments.CreateComment commentData) → bytes32` (external)

Calculates the EIP-712 hash for a comment




### `updateChannelContract(address _channelContract)` (external)

Updates the channel manager contract address (only owner)




### `getComment(bytes32 commentId) → struct Comments.Comment` (external)

Get a comment by its ID




### `isApproved(address author, address app) → bool` (external)

Get the approval status for an author and app




### `getNonce(address author, address app) → uint256` (external)

Get the nonce for an author and app




### `isDeleted(bytes32 commentId) → bool` (external)

Get the deleted status for a comment






