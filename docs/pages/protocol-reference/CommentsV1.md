##### @ecp.eth/protocol

----

# `CommentsV1`

This contract allows users to post and manage comments with optional app-signer approval and channel-specific hooks


Implements EIP-712 for typed structured data hashing and signing
Security Model:
1. Authentication:
   - Comments can be posted directly by authors or via signatures
   - App signers must be approved by authors
   - All signatures follow EIP-712 for better security
2. Authorization:
   - Only comment authors can delete their comments
   - App signer approvals can be revoked at any time
   - Nonce system prevents signature replay attacks
3. Hook System:
   - Protected against reentrancy
   - Channel-specific hooks are executed before and after comment operations
   - Channel owners control their hooks
4. Data Integrity:
   - Thread IDs are immutable once set
   - Parent-child relationships are verified
   - Comment IDs are cryptographically secure





## Events

### `CommentAdded(bytes32 commentId, address author, address appSigner, struct ICommentTypes.CommentData commentData)`

Emitted when a new comment is added




### `CommentDeleted(bytes32 commentId, address author)`

Emitted when a comment is deleted




### `ApprovalAdded(address author, address appSigner)`

Emitted when an author approves an app signer




### `ApprovalRemoved(address author, address appSigner)`

Emitted when an author removes an app signer's approval





## Functions

### `constructor(address initialOwner)` (public)

Constructor initializes the contract with the deployer as owner and channel manager


Sets up EIP-712 domain separator


### `postCommentAsAuthor(struct ICommentTypes.CommentData commentData, bytes appSignature)` (external)

Posts a comment directly from the author's address




### `postComment(struct ICommentTypes.CommentData commentData, bytes authorSignature, bytes appSignature)` (external)

Posts a comment with both author and app signer signatures




### `_postComment(struct ICommentTypes.CommentData commentData, bytes authorSignature, bytes appSignature)` (internal)

Internal function to handle comment posting logic




### `deleteCommentAsAuthor(bytes32 commentId)` (external)

Deletes a comment when called by the author directly




### `deleteComment(bytes32 commentId, address author, address appSigner, uint256 nonce, uint256 deadline, bytes authorSignature, bytes appSignature)` (external)

Deletes a comment with author signature verification




### `_deleteComment(bytes32 commentId, address author)` (internal)

Internal function to handle comment deletion logic




### `_addApproval(address author, address appSigner)` (internal)

Internal function to add an app signer approval




### `_revokeApproval(address author, address appSigner)` (internal)

Internal function to remove an app signer approval




### `addApprovalAsAuthor(address appSigner)` (external)

Approves an app signer when called directly by the author




### `revokeApprovalAsAuthor(address appSigner)` (external)

Removes an app signer approval when called directly by the author




### `addApproval(address author, address appSigner, uint256 nonce, uint256 deadline, bytes signature)` (external)

Approves an app signer with signature verification




### `removeApproval(address author, address appSigner, uint256 nonce, uint256 deadline, bytes signature)` (external)

Removes an app signer approval with signature verification




### `getAddApprovalHash(address author, address appSigner, uint256 nonce, uint256 deadline) → bytes32` (public)

Calculates the EIP-712 hash for a permit




### `getRemoveApprovalHash(address author, address appSigner, uint256 nonce, uint256 deadline) → bytes32` (public)

Calculates the EIP-712 hash for removing an approval




### `getDeleteCommentHash(bytes32 commentId, address author, address appSigner, uint256 nonce, uint256 deadline) → bytes32` (public)

Calculates the EIP-712 hash for deleting a comment




### `getCommentId(struct ICommentTypes.CommentData commentData) → bytes32` (public)

Calculates the EIP-712 hash for a comment




### `getComment(bytes32 commentId) → struct ICommentTypes.CommentData` (external)

Get comment data by ID




### `updateChannelContract(address _channelContract)` (external)

Updates the channel manager contract address (only owner)




### `_validateSignature(bytes signature)` (internal)

Validates a signature against malleability


Ensures signature follows EIP-2098 and has valid s value




