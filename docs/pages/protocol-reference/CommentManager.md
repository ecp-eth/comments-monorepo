##### @ecp.eth/protocol

----

# `CommentManager`

This contract allows users to post and manage comments with optional app-signer approval and channel-specific hooks


Implements EIP-712 for typed structured data hashing and signing







## Functions

### `constructor(address initialOwner)` (public)

Constructor initializes the contract with the deployer as owner and channel manager


Sets up EIP-712 domain separator


### `postComment(struct Comments.CreateComment commentData, bytes appSignature)` (external)

Posts a comment directly from the author's address




### `postCommentWithApproval(struct Comments.CreateComment commentData, bytes authorSignature, bytes appSignature)` (external)

Posts a comment with both author and app signer signatures




### `_postComment(struct Comments.CreateComment commentData, bytes authorSignature, bytes appSignature)` (internal)

Internal function to handle comment posting logic




### `editComment(bytes32 commentId, struct Comments.EditComment editData, bytes appSignature)` (external)

Edits a comment when called by the author directly




### `editCommentWithApproval(bytes32 commentId, struct Comments.EditComment editData, bytes authorSignature, bytes appSignature)` (external)

Edits a comment with both author and app signer signatures




### `_editComment(bytes32 commentId, struct Comments.EditComment editData, bytes authorSignature, bytes appSignature)` (internal)

Internal function to handle comment editing logic




### `deleteComment(bytes32 commentId)` (external)

Deletes a comment when called by the author directly




### `deleteCommentWithApproval(bytes32 commentId, address author, address app, uint256 nonce, uint256 deadline, bytes authorSignature, bytes appSignature)` (external)

Deletes a comment with author signature verification




### `_deleteComment(bytes32 commentId, address author)` (internal)

Internal function to handle comment deletion logic




### `_addApproval(address author, address app)` (internal)

Internal function to add an app signer approval




### `_revokeApproval(address author, address app)` (internal)

Internal function to remove an app signer approval




### `addApprovalAsAuthor(address app)` (external)

Approves an app signer when called directly by the author




### `revokeApprovalAsAuthor(address app)` (external)

Removes an app signer approval when called directly by the author




### `addApproval(address author, address app, uint256 nonce, uint256 deadline, bytes signature)` (external)

Approves an app signer with signature verification




### `removeApproval(address author, address app, uint256 nonce, uint256 deadline, bytes signature)` (external)

Removes an app signer approval with signature verification




### `getAddApprovalHash(address author, address app, uint256 nonce, uint256 deadline) → bytes32` (public)

Calculates the EIP-712 hash for a permit




### `getRemoveApprovalHash(address author, address app, uint256 nonce, uint256 deadline) → bytes32` (public)

Calculates the EIP-712 hash for removing an approval




### `getDeleteCommentHash(bytes32 commentId, address author, address app, uint256 nonce, uint256 deadline) → bytes32` (public)

Calculates the EIP-712 hash for deleting a comment




### `getEditCommentHash(bytes32 commentId, address author, struct Comments.EditComment editData) → bytes32` (public)

Calculates the EIP-712 hash for editing a comment




### `getCommentId(struct Comments.CreateComment commentData) → bytes32` (public)

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






