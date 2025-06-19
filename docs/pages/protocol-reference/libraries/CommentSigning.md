##### @ecp.eth/protocol

----

# `CommentSigning`

Handles EIP-712 signing, hash generation, and signature verification for comments









## Functions

### generateDomainSeparator(string name, string version, uint256 chainId, address verifyingContract) → bytes32 (internal)

Generate EIP-712 domain separator




### hashMetadataArray([struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata) → bytes32 (internal)

Hash metadata array for EIP-712




### getCommentId([struct Comments.CreateComment](/protocol-reference/types/Comments#createcomment) commentData, bytes32 domainSeparator) → bytes32 (internal)

Generate comment ID hash




### getEditCommentHash(bytes32 commentId, address author, [struct Comments.EditComment](/protocol-reference/types/Comments#editcomment) editData, bytes32 domainSeparator) → bytes32 (internal)

Generate edit comment hash




### getDeleteCommentHash(bytes32 commentId, address author, address app, uint256 deadline, bytes32 domainSeparator) → bytes32 (internal)

Generate delete comment hash




### getAddApprovalHash(address author, address app, uint256 expiry, uint256 nonce, uint256 deadline, bytes32 domainSeparator) → bytes32 (internal)

Generate add approval hash




### getRemoveApprovalHash(address author, address app, uint256 nonce, uint256 deadline, bytes32 domainSeparator) → bytes32 (internal)

Generate remove approval hash




### verifyAppSignature(address app, bytes32 hash, bytes signature, address msgSender) → bool (internal)

Verify app signature for comment operations




### verifyAuthorSignature(address author, bytes32 hash, bytes signature) → bool (internal)

Verify author signature






