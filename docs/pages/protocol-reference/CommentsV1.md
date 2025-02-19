##### @ecp.eth/protocol

---

# `CommentsV1`

This contract allows users to post and manage comments with optional app-signer approval

Implements EIP-712 for typed structured data hashing and signing

## Structs

### `CommentData`

The core data structure representing a comment in the protocol.

- **content:** string
  The actual content/text of the comment.

- **metadata:** string
  A stringified JSON object following the [JSON-LD (JSON for Linking Data)](https://json-ld.org/) standard. This can include additional structured data about the comment such as formatting, reactions, or other application-specific data.

- **targetUri:** string
  The URI of the target resource being commented on. This could be a URL, NFT identifier, or any other unique resource identifier.

- **parentId:** bytes32
  The ID of the parent comment if this is a reply. Zero bytes if this is a top-level comment.

- **author:** address
  The Ethereum address of the comment author.

- **appSigner:** address
  The Ethereum address of the application signer that may need to approve this comment.

- **nonce:** uint256
  A unique number used to prevent replay attacks.

- **deadline:** uint256
  The Unix timestamp after which this comment data is no longer valid.

## Events

### `CommentAdded(bytes32 commentId, address author, address appSigner, struct CommentsV1.CommentData commentData)`

Emitted when a new comment is added

### `CommentDeleted(bytes32 commentId, address author)`

Emitted when a comment is deleted

### `ApprovalAdded(address author, address appSigner)`

Emitted when an author approves an app signer

### `ApprovalRemoved(address author, address appSigner)`

Emitted when an author removes an app signer's approval

## Functions

### `postCommentAsAuthor(struct CommentsV1.CommentData commentData, bytes appSignature)` (external)

Posts a comment directly from the author's address

### `postComment(struct CommentsV1.CommentData commentData, bytes authorSignature, bytes appSignature)` (external)

Posts a comment with both author and app signer signatures

### `_postComment(struct CommentsV1.CommentData commentData, bytes authorSignature, bytes appSignature)` (internal)

Internal function to handle comment posting logic

### `deleteCommentAsAuthor(bytes32 commentId)` (external)

Deletes a comment when called by the author directly

### `deleteComment(bytes32 commentId, address author, address appSigner, uint256 nonce, uint256 deadline, bytes authorSignature, bytes appSignature)` (external)

Deletes a comment with author signature verification

### `_deleteComment(bytes32 commentId, address author)` (internal)

Internal function to handle comment deletion logic

### `_addApproval(address author, address appSigner)` (internal)

Internal function to add an app signer approval

### `_removeApproval(address author, address appSigner)` (internal)

Internal function to remove an app signer approval

### `addApprovalAsAuthor(address appSigner)` (external)

Approves an app signer when called directly by the author

### `removeApprovalAsAuthor(address appSigner)` (external)

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

### `getCommentId(struct CommentsV1.CommentData commentData) → bytes32` (public)

Calculates the EIP-712 hash for a comment
