##### @ecp.eth/protocol

----

# `FeeEstimatableHook`

Abstract base contract for all hook implementations


Provides default implementations that throw EstimatorNotImplemented if not overridden







## Functions

### supportsInterface(bytes4 interfaceId) → bool (public)



See {IERC165-supportsInterface}.

### estimateAddCommentFee([struct Comments.Comment](/protocol-reference/types/Comments#comment) commentData, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata, address msgSender) → [struct FeeEstimatable.FeeEstimation](/protocol-reference/types/FeeEstimatable#feeestimation) feeEstimation (external)

Should return the fee estimation for adding a comment




### estimateEditCommentFee([struct Comments.Comment](/protocol-reference/types/Comments#comment) commentData, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata, address msgSender) → [struct FeeEstimatable.FeeEstimation](/protocol-reference/types/FeeEstimatable#feeestimation) feeEstimation (external)

Should return the fee estimation for editing a comment




### _estimateAddCommentFee([struct Comments.Comment](/protocol-reference/types/Comments#comment), [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry), address) → [struct FeeEstimatable.FeeEstimation](/protocol-reference/types/FeeEstimatable#feeestimation) (internal)





### _estimateEditCommentFee([struct Comments.Comment](/protocol-reference/types/Comments#comment), [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry), address) → [struct FeeEstimatable.FeeEstimation](/protocol-reference/types/FeeEstimatable#feeestimation) (internal)







