##### @ecp.eth/protocol

----

# `Batching`











## Functions

### validateBatchOperations([struct Comments.BatchOperation[]](/protocol-reference/types/Comments#batchoperation) operations, uint256 msgValue) → uint256 totalRequiredValue (external)

Validate batch operations structure and value distribution




### validateBatchOperationSignatures([struct Comments.BatchOperation](/protocol-reference/types/Comments#batchoperation) operation, uint256 operationIndex) (external)

Validate a single batch operation's signature requirements




### decodePostCommentData([struct Comments.BatchOperation](/protocol-reference/types/Comments#batchoperation) operation) → [struct Comments.CreateComment](/protocol-reference/types/Comments#createcomment) commentData (external)

Decode batch operation data for POST_COMMENT and POST_COMMENT_WITH_SIG




### decodeEditCommentData([struct Comments.BatchOperation](/protocol-reference/types/Comments#batchoperation) operation) → bytes32 commentId, [struct Comments.EditComment](/protocol-reference/types/Comments#editcomment) editData (external)

Decode batch operation data for EDIT_COMMENT and EDIT_COMMENT_WITH_SIG




### decodeDeleteCommentData([struct Comments.BatchOperation](/protocol-reference/types/Comments#batchoperation) operation) → bytes32 commentId (external)

Decode batch operation data for DELETE_COMMENT




### decodeDeleteCommentWithSigData([struct Comments.BatchOperation](/protocol-reference/types/Comments#batchoperation) operation) → [struct Comments.BatchDeleteData](/protocol-reference/types/Comments#batchdeletedata) deleteData (external)

Decode batch operation data for DELETE_COMMENT_WITH_SIG




### encodeCommentIdResult(bytes32 commentId) → bytes result (external)

Encode a comment ID as result data






